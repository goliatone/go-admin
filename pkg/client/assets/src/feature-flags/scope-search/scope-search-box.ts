/**
 * Scope Search Box
 * Specialized search box for feature flags scope selection
 * Switches resolver/renderer based on selected scope type
 */

import { SearchBox } from '../../searchbox/search-box.js';
import { createCrudResolver } from '../../searchbox/resolvers/api-resolver.js';
import { UserRenderer } from '../../searchbox/renderers/user-renderer.js';
import { EntityRenderer } from '../../searchbox/renderers/entity-renderer.js';
import type { SearchResult, SearchResolver } from '../../searchbox/types.js';
import type { ScopeSearchBoxConfig, ScopeConfig, ScopeType } from './types.js';

/**
 * Noop resolver for system scope (no search needed)
 */
class SystemResolver implements SearchResolver {
  async search(): Promise<SearchResult[]> {
    return [];
  }
}

export class ScopeSearchBox {
  private config: ScopeSearchBoxConfig;
  private input: HTMLInputElement;
  private scopeSelect: HTMLSelectElement;
  private container: HTMLElement;
  private searchBox: SearchBox | null = null;
  private scopeConfigs: Map<ScopeType, ScopeConfig> = new Map();
  private currentScope: ScopeType = 'system';
  private selectedResult: SearchResult | null = null;

  constructor(config: ScopeSearchBoxConfig) {
    this.config = config;

    // Resolve input element
    if (typeof config.input === 'string') {
      const el = document.querySelector<HTMLInputElement>(config.input);
      if (!el) throw new Error(`ScopeSearchBox: Input element not found: ${config.input}`);
      this.input = el;
    } else {
      this.input = config.input;
    }

    // Resolve scope select element
    if (typeof config.scopeSelect === 'string') {
      const el = document.querySelector<HTMLSelectElement>(config.scopeSelect);
      if (!el) throw new Error(`ScopeSearchBox: Scope select not found: ${config.scopeSelect}`);
      this.scopeSelect = el;
    } else {
      this.scopeSelect = config.scopeSelect;
    }

    // Resolve container
    if (config.container) {
      if (typeof config.container === 'string') {
        const el = document.querySelector<HTMLElement>(config.container);
        if (!el) throw new Error(`ScopeSearchBox: Container not found: ${config.container}`);
        this.container = el;
      } else {
        this.container = config.container;
      }
    } else {
      this.container = this.input.parentElement || document.body;
    }

    // Index scope configs
    for (const scopeConfig of config.scopeConfigs) {
      this.scopeConfigs.set(scopeConfig.scope, scopeConfig);
    }
  }

  /**
   * Initialize the scope search box
   */
  init(): void {
    this.bindScopeSelect();
    this.currentScope = (this.scopeSelect.value as ScopeType) || 'system';
    this.updateForScope(this.currentScope);
  }

  /**
   * Destroy and clean up
   */
  destroy(): void {
    if (this.searchBox) {
      this.searchBox.destroy();
      this.searchBox = null;
    }
  }

  /**
   * Get the currently selected scope type
   */
  getScope(): ScopeType {
    return this.currentScope;
  }

  /**
   * Get the currently selected scope ID
   */
  getScopeId(): string {
    return this.input.value.trim();
  }

  /**
   * Get the selected result data
   */
  getSelectedResult(): SearchResult | null {
    return this.selectedResult;
  }

  /**
   * Programmatically set the scope
   */
  setScope(scope: ScopeType): void {
    this.scopeSelect.value = scope;
    this.updateForScope(scope);
  }

  /**
   * Programmatically set the scope ID
   */
  setScopeId(id: string): void {
    this.input.value = id;
    if (this.searchBox) {
      this.searchBox.setValue(id);
    }
  }

  /**
   * Clear the scope ID
   */
  clear(): void {
    this.selectedResult = null;
    if (this.searchBox) {
      this.searchBox.clear();
    } else {
      this.input.value = '';
    }
    this.config.onClear?.();
  }

  private bindScopeSelect(): void {
    this.scopeSelect.addEventListener('change', () => {
      const newScope = this.scopeSelect.value as ScopeType;
      this.updateForScope(newScope);
      this.config.onScopeChange?.(newScope);
    });
  }

  private updateForScope(scope: ScopeType): void {
    this.currentScope = scope;
    this.selectedResult = null;

    // Destroy existing search box
    if (this.searchBox) {
      this.searchBox.destroy();
      this.searchBox = null;
    }

    // System scope doesn't need search
    if (scope === 'system') {
      this.input.value = '';
      this.input.disabled = true;
      this.input.placeholder = 'N/A (System scope)';
      return;
    }

    // Enable input
    this.input.disabled = false;
    this.input.value = '';

    // Get scope-specific config
    const scopeConfig = this.scopeConfigs.get(scope);

    if (scopeConfig) {
      // Create search box with scope-specific config
      this.searchBox = new SearchBox({
        input: this.input,
        container: this.container,
        resolver: scopeConfig.resolver,
        renderer: scopeConfig.renderer,
        placeholder: scopeConfig.placeholder || this.getDefaultPlaceholder(scope),
        minChars: scopeConfig.minChars ?? 2,
        onSelect: (result) => {
          this.selectedResult = result;
          this.config.onSelect?.(scope, result);
        },
        onClear: () => {
          this.selectedResult = null;
          this.config.onClear?.();
        },
      });
      this.searchBox.init();
    } else {
      // No config for this scope - just use plain input
      this.input.placeholder = this.getDefaultPlaceholder(scope);
    }
  }

  private getDefaultPlaceholder(scope: ScopeType): string {
    const placeholders: Record<ScopeType, string> = {
      system: 'N/A',
      tenant: 'Search tenants...',
      org: 'Search organizations...',
      user: 'Search users...',
    };
    return this.config.defaultPlaceholder || placeholders[scope] || 'Enter ID...';
  }
}

/**
 * Create default scope configs for common go-admin setup
 * Uses go-crud endpoints for tenants, orgs, and users
 */
export function createDefaultScopeConfigs(basePath: string): ScopeConfig[] {
  return [
    {
      scope: 'tenant',
      resolver: createCrudResolver<Record<string, unknown>>(`${basePath}/api/tenants`, {
        labelField: (item) => String(item.name || ''),
        descriptionField: (item) => String(item.slug || ''),
        searchParam: 'q',
      }),
      renderer: new EntityRenderer({
        badgeField: 'status',
      }),
      placeholder: 'Search tenants by name...',
    },
    {
      scope: 'org',
      resolver: createCrudResolver<Record<string, unknown>>(`${basePath}/api/organizations`, {
        labelField: (item) => String(item.name || ''),
        searchParam: 'q',
      }),
      renderer: new EntityRenderer({
        badgeField: 'status',
      }),
      placeholder: 'Search organizations...',
    },
    {
      scope: 'user',
      resolver: createCrudResolver<Record<string, unknown>>(`${basePath}/api/users`, {
        labelField: (item) => String(item.displayName || item.username || item.email || ''),
        descriptionField: (item) => String(item.email || ''),
        searchParam: 'q',
      }),
      renderer: new UserRenderer({
        avatarField: 'avatar',
        emailField: 'email',
        roleField: 'role',
      }),
      placeholder: 'Search users...',
    },
  ];
}

/**
 * Factory function to create ScopeSearchBox with common defaults
 */
export function createScopeSearchBox(options: {
  inputSelector: string;
  scopeSelectSelector: string;
  containerSelector?: string;
  basePath: string;
  customConfigs?: Partial<Record<ScopeType, Partial<ScopeConfig>>>;
  onSelect?: (scope: ScopeType, result: SearchResult) => void;
  onScopeChange?: (scope: ScopeType) => void;
}): ScopeSearchBox {
  const defaultConfigs: ScopeConfig[] = [
    {
      scope: 'tenant',
      resolver: createCrudResolver<Record<string, unknown>>(`${options.basePath}/crud/tenants`, {
        labelField: (item) => String(item.name || ''),
        descriptionField: (item) => String(item.slug || ''),
        searchParam: 'q',
      }),
      renderer: new EntityRenderer({
        badgeField: 'status',
      }),
      placeholder: 'Search tenants...',
    },
    {
      scope: 'org',
      resolver: createCrudResolver<Record<string, unknown>>(`${options.basePath}/crud/organizations`, {
        labelField: (item) => String(item.name || ''),
        searchParam: 'q',
      }),
      renderer: new EntityRenderer({
        badgeField: 'status',
      }),
      placeholder: 'Search organizations...',
    },
    {
      scope: 'user',
      resolver: createCrudResolver<Record<string, unknown>>(`${options.basePath}/crud/users`, {
        labelField: (item) => String(item.display_name || item.username || item.email || ''),
        descriptionField: (item) => String(item.email || ''),
        searchParam: 'q',
      }),
      renderer: new UserRenderer({
        avatarField: 'avatar',
        emailField: 'email',
        roleField: 'role',
      }),
      placeholder: 'Search users...',
    },
  ];

  // Merge custom configs
  const scopeConfigs = defaultConfigs.map((config) => {
    const custom = options.customConfigs?.[config.scope];
    if (custom) {
      return { ...config, ...custom };
    }
    return config;
  });

  return new ScopeSearchBox({
    input: options.inputSelector,
    scopeSelect: options.scopeSelectSelector,
    container: options.containerSelector,
    scopeConfigs,
    onSelect: options.onSelect,
    onScopeChange: options.onScopeChange,
  });
}
