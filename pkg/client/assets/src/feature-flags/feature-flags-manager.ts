/**
 * Feature Flags Manager
 * Manages feature flag display, filtering, and updates
 */

import type {
  Flag,
  FlagsPayload,
  FeatureFlagsConfig,
  FeatureFlagsSelectors,
  OverrideState,
  ActionMenuOption,
  ToastNotifier,
} from './types.js';
import type { ScopeType, ScopeConfig } from './scope-search/types.js';
import { ScopeSearchBox } from './scope-search/scope-search-box.js';
import { createCrudResolver } from '../searchbox/resolvers/api-resolver.js';
import { UserRenderer } from '../searchbox/renderers/user-renderer.js';
import { EntityRenderer } from '../searchbox/renderers/entity-renderer.js';

const DEFAULT_SELECTORS: FeatureFlagsSelectors = {
  scopeSelect: '#flag-scope',
  scopeIdInput: '#flag-scope-id',
  applyScopeBtn: '#apply-scope',
  refreshBtn: '#refresh-flags',
  searchInput: '#flag-search',
  mutableState: '#mutable-state',
  tableBody: '#flags-table',
  emptyState: '#flags-empty',
};

const ACTION_OPTIONS: ActionMenuOption[] = [
  { value: 'unset', label: 'Default', icon: 'minus' },
  { value: 'enabled', label: 'Enabled', icon: 'check' },
  { value: 'disabled', label: 'Disabled', icon: 'x' },
];

const ICONS: Record<string, string> = {
  check: '<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
  x: '<svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
  minus: '<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>',
  chevronDown: '<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>',
};

export class FeatureFlagsManager {
  private config: FeatureFlagsConfig;
  private selectors: FeatureFlagsSelectors;
  private toast: ToastNotifier | null;

  private scopeSelect: HTMLSelectElement | null = null;
  private scopeIdInput: HTMLInputElement | null = null;
  private applyScopeBtn: HTMLButtonElement | null = null;
  private refreshBtn: HTMLButtonElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private mutableStateEl: HTMLElement | null = null;
  private tableBody: HTMLTableSectionElement | null = null;
  private emptyState: HTMLElement | null = null;

  private allFlags: Flag[] = [];
  private isMutable = false;
  private documentClickHandler: (() => void) | null = null;
  private scopeSearchBox: ScopeSearchBox | null = null;

  constructor(
    config: FeatureFlagsConfig,
    selectors: Partial<FeatureFlagsSelectors> = {},
    toast?: ToastNotifier
  ) {
    this.config = config;
    this.selectors = { ...DEFAULT_SELECTORS, ...selectors };
    this.toast = toast || (window as any).toastManager || null;
  }

  /**
   * Initialize the feature flags manager
   */
  init(): void {
    this.cacheElements();
    this.bindEvents();
    this.initScopeSearch();
    this.syncFromQuery();
    this.loadFlags();
  }

  /**
   * Destroy the manager and clean up event listeners
   */
  destroy(): void {
    if (this.documentClickHandler) {
      document.removeEventListener('click', this.documentClickHandler);
      this.documentClickHandler = null;
    }
    if (this.scopeSearchBox) {
      this.scopeSearchBox.destroy();
      this.scopeSearchBox = null;
    }
  }

  private cacheElements(): void {
    this.scopeSelect = document.querySelector<HTMLSelectElement>(this.selectors.scopeSelect);
    this.scopeIdInput = document.querySelector<HTMLInputElement>(this.selectors.scopeIdInput);
    this.applyScopeBtn = document.querySelector<HTMLButtonElement>(this.selectors.applyScopeBtn);
    this.refreshBtn = document.querySelector<HTMLButtonElement>(this.selectors.refreshBtn);
    this.searchInput = document.querySelector<HTMLInputElement>(this.selectors.searchInput);
    this.mutableStateEl = document.querySelector<HTMLElement>(this.selectors.mutableState);
    this.tableBody = document.querySelector<HTMLTableSectionElement>(this.selectors.tableBody);
    this.emptyState = document.querySelector<HTMLElement>(this.selectors.emptyState);
  }

  private bindEvents(): void {
    this.applyScopeBtn?.addEventListener('click', () => this.loadFlags());
    this.refreshBtn?.addEventListener('click', () => this.loadFlags());
    this.searchInput?.addEventListener('input', () => this.renderFlags(this.allFlags, this.isMutable));

    // Global click handler to close dropdowns
    this.documentClickHandler = () => {
      document.querySelectorAll('.action-menu-dropdown').forEach((d) => d.classList.add('hidden'));
    };
    document.addEventListener('click', this.documentClickHandler);
  }

  private initScopeSearch(): void {
    if (!this.scopeSelect || !this.scopeIdInput) return;

    // Build scope configs for tenant, org, user
    const scopeConfigs = this.buildScopeConfigs();

    // Create container for the searchbox dropdown
    const container = this.scopeIdInput.parentElement;
    if (!container) return;

    // Ensure container has relative positioning for dropdown
    container.style.position = 'relative';

    this.scopeSearchBox = new ScopeSearchBox({
      input: this.scopeIdInput,
      scopeSelect: this.scopeSelect,
      container,
      scopeConfigs,
      onSelect: (scope, result) => {
        // When a result is selected, use its ID
        if (this.scopeIdInput) {
          this.scopeIdInput.value = result.id;
        }
      },
      onScopeChange: (scope) => {
        // When scope changes, clear the ID and reload
        if (scope === 'system') {
          this.loadFlags();
        }
      },
      onClear: () => {
        // Nothing to do on clear
      },
    });

    this.scopeSearchBox.init();
  }

  private buildScopeConfigs(): ScopeConfig[] {
    const basePath = this.config.basePath;

    return [
      {
        scope: 'tenant' as ScopeType,
        resolver: createCrudResolver<Record<string, unknown>>(`${basePath}/crud/tenants`, {
          labelField: (item) => String(item.name || ''),
          descriptionField: (item) => String(item.slug || ''),
          searchParam: 'q',
        }),
        renderer: new EntityRenderer({
          badgeField: 'status',
        }),
        placeholder: 'Search tenants...',
        minChars: 1,
      },
      {
        scope: 'org' as ScopeType,
        resolver: createCrudResolver<Record<string, unknown>>(`${basePath}/crud/organizations`, {
          labelField: (item) => String(item.name || ''),
          searchParam: 'q',
        }),
        renderer: new EntityRenderer({
          badgeField: 'status',
        }),
        placeholder: 'Search organizations...',
        minChars: 1,
      },
      {
        scope: 'user' as ScopeType,
        resolver: createCrudResolver<Record<string, unknown>>(`${basePath}/crud/users`, {
          labelField: (item) => String(item.display_name || item.username || item.email || 'Unknown'),
          descriptionField: (item) => String(item.email || ''),
          searchParam: 'q',
        }),
        renderer: new UserRenderer({
          avatarField: 'avatar',
          emailField: 'email',
          roleField: 'role',
        }),
        placeholder: 'Search users...',
        minChars: 1,
      },
    ];
  }

  private syncFromQuery(): void {
    const params = new URLSearchParams(window.location.search);
    const scope = params.get('scope') as ScopeType | null;
    const scopeId = params.get('scope_id');

    if (scope && this.scopeSearchBox) {
      this.scopeSearchBox.setScope(scope);
      if (scopeId) {
        this.scopeSearchBox.setScopeId(scopeId);
      }
    } else {
      // Fallback for when scope search isn't enabled
      if (scope && this.scopeSelect) {
        this.scopeSelect.value = scope;
      }
      if (scopeId && this.scopeIdInput) {
        this.scopeIdInput.value = scopeId;
      }
    }
  }

  private syncUrl(): void {
    const params = new URLSearchParams();
    const scope = this.scopeSelect?.value || 'system';
    params.set('scope', scope);

    if (scope !== 'system' && this.scopeIdInput?.value.trim()) {
      params.set('scope_id', this.scopeIdInput.value.trim());
    }

    const query = params.toString();
    const next = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState({}, '', next);
  }

  private buildScopeParams(): { scope: string; scopeId: string; params: URLSearchParams } {
    // Use scopeSearchBox if available, otherwise fall back to direct element access
    const scope = this.scopeSearchBox?.getScope() || this.scopeSelect?.value || 'system';
    const scopeId = this.scopeSearchBox?.getScopeId() || this.scopeIdInput?.value.trim() || '';
    const params = new URLSearchParams();
    params.set('scope', scope);

    if (scope !== 'system' && scopeId) {
      params.set('scope_id', scopeId);
    }

    return { scope, scopeId, params };
  }

  async loadFlags(): Promise<void> {
    const { params } = this.buildScopeParams();
    this.syncUrl();

    const url = `${this.config.apiPath}?${params.toString()}`;

    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });

      if (!response.ok) {
        const text = await response.text();
        this.toast?.error(text || 'Failed to load flags.');
        return;
      }

      const payload: FlagsPayload = await response.json();
      this.isMutable = !!payload.mutable;

      if (this.mutableStateEl) {
        this.mutableStateEl.textContent = this.isMutable ? 'Yes' : 'No';
      }

      this.allFlags = payload.flags || [];
      this.renderFlags(this.allFlags, this.isMutable);
    } catch (err) {
      this.toast?.error('Failed to load flags.');
    }
  }

  async updateFlag(key: string, state: OverrideState): Promise<void> {
    const { scope, scopeId } = this.buildScopeParams();

    if (scope !== 'system' && !scopeId) {
      this.toast?.error('Scope ID required for tenant/org/user scopes.');
      await this.loadFlags();
      return;
    }

    const payload: Record<string, any> = { key, scope };
    if (scopeId) {
      payload.scope_id = scopeId;
    }

    let method = 'POST';
    if (state === 'unset') {
      method = 'DELETE';
    } else {
      payload.enabled = state === 'enabled';
    }

    try {
      const response = await fetch(this.config.apiPath, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        this.toast?.error(text || 'Failed to update flag.');
      } else {
        this.toast?.success('Flag updated.');
      }
    } catch (err) {
      this.toast?.error('Failed to update flag.');
    }

    await this.loadFlags();
  }

  private renderFlags(flags: Flag[], mutable: boolean): void {
    if (!this.tableBody || !this.emptyState) return;

    this.tableBody.innerHTML = '';

    const searchTerm = (this.searchInput?.value || '').toLowerCase().trim();
    const filtered = searchTerm
      ? flags.filter((f) => f.key && f.key.toLowerCase().includes(searchTerm))
      : flags;

    if (filtered.length === 0) {
      this.emptyState.classList.remove('hidden');
      return;
    }

    this.emptyState.classList.add('hidden');

    filtered.forEach((flag) => {
      const row = this.createFlagRow(flag, mutable);
      this.tableBody!.appendChild(row);
    });

    this.wireActionMenus();
  }

  private createFlagRow(flag: Flag, mutable: boolean): HTMLTableRowElement {
    const effective = flag.effective ? 'Enabled' : 'Disabled';
    const effectiveBadge = this.badge(effective, flag.effective ? 'on' : 'off');
    const source = flag.source || 'unknown';
    const defaultValue =
      flag.default && flag.default.set ? (flag.default.value ? 'Enabled' : 'Disabled') : '—';

    const overrideState = this.normalizeOverrideState(flag);
    const overrideValue =
      flag.override && flag.override.value !== undefined
        ? flag.override.value
          ? 'Enabled'
          : 'Disabled'
        : '—';
    const overrideLabel =
      overrideState === 'enabled' || overrideState === 'disabled' ? overrideValue : 'Default';
    const overrideBadge = this.badge(
      overrideLabel,
      overrideState === 'enabled' ? 'on' : overrideState === 'disabled' ? 'off' : 'neutral'
    );

    const currentVal = this.currentOverrideValue(flag);
    const key = flag.key || '';
    const description = flag.description ? this.escapeHtml(flag.description) : '';
    const descriptionMarkup = description
      ? `<div class="mt-1 text-xs text-gray-500">${description}</div>`
      : '';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="px-5 py-4 text-sm">
        <div class="text-gray-900 font-mono">${this.escapeHtml(key)}</div>
        ${descriptionMarkup}
      </td>
      <td class="px-5 py-4 text-sm">${effectiveBadge}</td>
      <td class="px-5 py-4 text-sm text-gray-600 capitalize">${this.escapeHtml(source)}</td>
      <td class="px-5 py-4 text-sm text-gray-600">${defaultValue}</td>
      <td class="px-5 py-4 text-sm">${overrideBadge}</td>
      <td class="px-5 py-4 text-sm">${this.renderActionMenu(key, currentVal, !mutable)}</td>
    `;

    return row;
  }

  private badge(label: string, intent: 'on' | 'off' | 'neutral'): string {
    const base = 'status-badge';
    if (intent === 'on') {
      return `<span class="${base} status-active">${this.escapeHtml(label)}</span>`;
    }
    if (intent === 'off') {
      return `<span class="${base} status-disabled">${this.escapeHtml(label)}</span>`;
    }
    return `<span class="${base} status-draft">${this.escapeHtml(label)}</span>`;
  }

  private normalizeOverrideState(flag: Flag): string {
    const state = flag.override?.state ? String(flag.override.state) : 'missing';
    return state.toLowerCase();
  }

  private currentOverrideValue(flag: Flag): OverrideState {
    const state = this.normalizeOverrideState(flag);
    if (state === 'enabled') return 'enabled';
    if (state === 'disabled') return 'disabled';
    return 'unset';
  }

  private renderActionMenu(key: string, currentValue: OverrideState, disabled: boolean): string {
    const disabledClass = disabled ? 'opacity-50 pointer-events-none' : '';
    const currentOption = ACTION_OPTIONS.find((o) => o.value === currentValue);

    return `
      <div class="relative action-menu ${disabledClass}" data-flag-key="${this.escapeHtml(key)}">
        <button type="button" class="action-menu-trigger inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-0" ${disabled ? 'disabled' : ''}>
          <span class="action-menu-label">${currentOption?.label || 'Default'}</span>
          ${ICONS.chevronDown}
        </button>
        <div class="action-menu-dropdown hidden absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
          ${ACTION_OPTIONS.map(
            (opt) => `
            <button type="button" data-value="${opt.value}" class="action-menu-item w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${opt.value === currentValue ? 'bg-gray-50 font-medium' : ''}">
              ${ICONS[opt.icon] || ''}
              ${opt.label}
            </button>
          `
          ).join('')}
        </div>
      </div>
    `;
  }

  private wireActionMenus(): void {
    document.querySelectorAll('.action-menu').forEach((menu) => {
      const trigger = menu.querySelector<HTMLButtonElement>('.action-menu-trigger');
      const dropdown = menu.querySelector<HTMLElement>('.action-menu-dropdown');
      const items = menu.querySelectorAll<HTMLButtonElement>('.action-menu-item');
      const key = (menu as HTMLElement).dataset.flagKey;

      if (!trigger || !dropdown || !key) return;

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close other open menus
        document.querySelectorAll('.action-menu-dropdown').forEach((d) => {
          if (d !== dropdown) d.classList.add('hidden');
        });
        dropdown.classList.toggle('hidden');
      });

      items.forEach((item) => {
        item.addEventListener('click', async (e) => {
          e.stopPropagation();
          const value = item.dataset.value as OverrideState;
          dropdown.classList.add('hidden');
          await this.updateFlag(key, value);
        });
      });
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
