import { createLogger } from '../shared/logger.js';

import { escapeHTML as escapeHtml } from '../shared/html.js';
import { escapeAttribute as escapeAttr } from '../shared/html.js';

const logger = createLogger("DataGrid");

/**
 * Quick Filters Component (Phase 2)
 *
 * Provides preset filter buttons for common translation filter scenarios.
 * Supports capability-aware disabled states with visible reason text.
 *
 * Contract:
 * - Quick filters are visible-disabled when unsupported, not hidden
 * - Each filter shows a reason when disabled
 * - Filter state is synchronized with DataGrid
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Quick filter definition
 */
export interface QuickFilter {
  /** Unique filter key */
  key: string;
  /** Display label */
  label: string;
  /** Filter field name */
  field: string;
  /** Filter value */
  value: string;
  /** Icon or badge (optional) */
  icon?: string;
  /** Stable semantic tone rendered through the canonical component stylesheet. */
  tone?: 'neutral' | 'success' | 'warning' | 'error' | 'info';
  /** Additive consumer class. Framework-owned presentation belongs in components.css. */
  styleClass?: string;
  /** Tooltip description */
  description?: string;
}

/**
 * Quick filter capability - defines whether a filter is supported
 */
export interface QuickFilterCapability {
  /** The filter key */
  key: string;
  /** Whether the filter is supported */
  supported: boolean;
  /** Reason why filter is disabled (when not supported) */
  disabledReason?: string;
}

/**
 * Quick filter state
 */
export interface QuickFilterState {
  /** Currently active filter key (null if none) */
  activeKey: string | null;
  /** Filter capabilities */
  capabilities: Map<string, QuickFilterCapability>;
}

/**
 * Quick filters configuration
 */
export interface QuickFiltersConfig {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Available filters */
  filters: QuickFilter[];
  /** Initial capabilities (optional) */
  capabilities?: QuickFilterCapability[];
  /** Callback when filter is selected */
  onFilterSelect: (filter: QuickFilter | null) => void;
  /** Additional CSS classes */
  containerClass?: string;
  /** Size variant */
  size?: 'sm' | 'default';
}

// ============================================================================
// Default Translation Quick Filters
// ============================================================================

/**
 * Default quick filters for translation readiness states
 */
export const DEFAULT_TRANSLATION_QUICK_FILTERS: QuickFilter[] = [
  {
    key: 'all',
    label: 'All',
    field: '',
    value: '',
    icon: '○',
    tone: 'neutral',
    description: 'Show all records',
  },
  {
    key: 'ready',
    label: 'Ready',
    field: 'readiness_state',
    value: 'ready',
    icon: '●',
    tone: 'success',
    description: 'All translations complete',
  },
  {
    key: 'missing_locales',
    label: 'Missing',
    field: 'readiness_state',
    value: 'missing_locales',
    icon: '○',
    tone: 'warning',
    description: 'Missing required locale translations',
  },
  {
    key: 'missing_fields',
    label: 'Incomplete',
    field: 'readiness_state',
    value: 'missing_fields',
    icon: '◐',
    tone: 'warning',
    description: 'Has translations but missing required fields',
  },
  {
    key: 'fallback',
    label: 'Fallback',
    field: 'fallback_used',
    value: 'true',
    icon: '⚠',
    tone: 'warning',
    description: 'Records currently viewed in fallback mode',
  },
];

// ============================================================================
// Quick Filters Component
// ============================================================================

export class QuickFilters {
  private container: HTMLElement | null = null;
  private config: QuickFiltersConfig;
  private state: QuickFilterState;

  constructor(config: QuickFiltersConfig) {
    this.config = config;

    // Resolve container
    this.container = typeof config.container === 'string'
      ? document.querySelector<HTMLElement>(config.container)
      : config.container;

    // Initialize state
    this.state = {
      activeKey: null,
      capabilities: new Map(),
    };

    // Apply initial capabilities
    if (config.capabilities) {
      for (const cap of config.capabilities) {
        this.state.capabilities.set(cap.key, cap);
      }
    }

    // Set defaults for filters without explicit capability
    for (const filter of config.filters) {
      if (!this.state.capabilities.has(filter.key)) {
        this.state.capabilities.set(filter.key, { key: filter.key, supported: true });
      }
    }

    this.render();
  }

  /**
   * Render the quick filters
   */
  render(): void {
    if (!this.container) {
      logger.warn('[QuickFilters] Container not found');
      return;
    }

    const { size = 'default', containerClass = '' } = this.config;

    const filtersHtml = this.config.filters
      .map((filter) => this.renderFilterButton(filter, size))
      .join('');

    this.container.innerHTML = `
      <div class="quick-filters ${containerClass}"
           role="group"
           aria-label="Quick filters">
        ${filtersHtml}
      </div>
    `;

    // Bind click handlers
    this.bindEventListeners();
  }

  /**
   * Render a single filter button
   */
  private renderFilterButton(filter: QuickFilter, size: 'sm' | 'default'): string {
    const capability = this.state.capabilities.get(filter.key);
    const isSupported = capability?.supported !== false;
    const isActive = this.state.activeKey === filter.key;
    const disabledReason = capability?.disabledReason || 'Filter not available';

    let ariaAttributes: string;

    if (!isSupported) {
      // Disabled state with visible reason
      ariaAttributes = `aria-disabled="true" aria-pressed="false" title="${escapeAttr(disabledReason)}"`;
    } else if (isActive) {
      // Active state
      ariaAttributes = 'aria-pressed="true"';
    } else {
      // Normal state
      ariaAttributes = 'aria-pressed="false"';
    }

    const iconHtml = filter.icon
      ? `<span aria-hidden="true">${filter.icon}</span>`
      : '';

    return `
      <button type="button"
              class="quick-filter quick-filter--${size} ${escapeAttr(filter.styleClass || '')}"
              data-quick-filter-value="${escapeAttr(filter.value)}"
              data-quick-filter-key="${escapeAttr(filter.key)}"
              data-filter-key="${escapeAttr(filter.key)}"
              data-tone="${escapeAttr(filter.tone || 'neutral')}"
              data-state="${isSupported ? (isActive ? 'active' : 'inactive') : 'disabled'}"
              ${ariaAttributes}
              ${!isSupported ? 'disabled' : ''}>
        ${iconHtml}
        <span>${escapeHtml(filter.label)}</span>
      </button>
    `;
  }

  /**
   * Bind event listeners to filter buttons
   */
  private bindEventListeners(): void {
    if (!this.container) return;

    const buttons = this.container.querySelectorAll<HTMLButtonElement>('[data-quick-filter-value]');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
      const key = btn.dataset.quickFilterKey || btn.dataset.filterKey;
        if (key && !btn.disabled) {
          this.selectFilter(key);
        }
      });
    });
  }

  /**
   * Select a filter by key
   */
  selectFilter(key: string): void {
    const filter = this.config.filters.find((f) => f.key === key);
    if (!filter) {
      logger.warn(`[QuickFilters] Filter not found: ${key}`);
      return;
    }

    const capability = this.state.capabilities.get(key);
    if (capability?.supported === false) {
      logger.warn(`[QuickFilters] Filter not supported: ${key}`);
      return;
    }

    // Toggle if same filter clicked
    if (this.state.activeKey === key) {
      this.clearFilter();
      return;
    }

    this.state.activeKey = key;
    this.render();

    // Notify callback
    if (filter.field === '') {
      // "All" filter clears the filter
      this.config.onFilterSelect(null);
    } else {
      this.config.onFilterSelect(filter);
    }
  }

  /**
   * Clear the active filter
   */
  clearFilter(): void {
    this.state.activeKey = null;
    this.render();
    this.config.onFilterSelect(null);
  }

  /**
   * Update filter capabilities
   */
  updateCapabilities(capabilities: QuickFilterCapability[]): void {
    for (const cap of capabilities) {
      this.state.capabilities.set(cap.key, cap);
    }
    this.render();
  }

  /**
   * Set a specific capability
   */
  setCapability(key: string, supported: boolean, disabledReason?: string): void {
    this.state.capabilities.set(key, { key, supported, disabledReason });
    this.render();
  }

  /**
   * Get current active filter
   */
  getActiveFilter(): QuickFilter | null {
    if (!this.state.activeKey) return null;
    return this.config.filters.find((f) => f.key === this.state.activeKey) || null;
  }

  /**
   * Set active filter programmatically
   */
  setActiveFilter(key: string | null): void {
    this.state.activeKey = key;
    this.render();
  }

  /**
   * Destroy the component
   */
  destroy(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.container = null;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create quick filters for translation readiness
 */
export function createTranslationQuickFilters(
  container: HTMLElement | string,
  onFilterSelect: (filter: QuickFilter | null) => void,
  options: {
    capabilities?: QuickFilterCapability[];
    size?: 'sm' | 'default';
    containerClass?: string;
  } = {}
): QuickFilters {
  return new QuickFilters({
    container,
    filters: DEFAULT_TRANSLATION_QUICK_FILTERS,
    onFilterSelect,
    ...options,
  });
}

/**
 * Initialize quick filters on elements with data-quick-filters attribute
 */
export function initQuickFilters(
  onFilterSelect: (filter: QuickFilter | null, container: HTMLElement) => void
): QuickFilters[] {
  const elements = document.querySelectorAll<HTMLElement>('[data-quick-filters]');
  const instances: QuickFilters[] = [];

  elements.forEach((el) => {
    // Skip if already initialized
    if (el.hasAttribute('data-quick-filters-init')) {
      return;
    }

    const size = (el.dataset.size as 'sm' | 'default') || 'default';

    const instance = createTranslationQuickFilters(
      el,
      (filter) => onFilterSelect(filter, el),
      { size }
    );

    el.setAttribute('data-quick-filters-init', 'true');
    instances.push(instance);
  });

  return instances;
}

/**
 * Render inline quick filters HTML for embedding in templates
 */
export function renderQuickFiltersHTML(options: {
  filters?: QuickFilter[];
  activeKey?: string | null;
  capabilities?: QuickFilterCapability[];
  size?: 'sm' | 'default';
  containerClass?: string;
} = {}): string {
  const {
    filters = DEFAULT_TRANSLATION_QUICK_FILTERS,
    activeKey = null,
    capabilities = [],
    size = 'default',
    containerClass = '',
  } = options;

  const capMap = new Map<string, QuickFilterCapability>();
  for (const cap of capabilities) {
    capMap.set(cap.key, cap);
  }

  const filtersHtml = filters
    .map((filter) => {
      const capability = capMap.get(filter.key);
      const isSupported = capability?.supported !== false;
      const isActive = activeKey === filter.key;
      const disabledReason = capability?.disabledReason || 'Filter not available';

      const iconHtml = filter.icon ? `<span aria-hidden="true">${escapeHtml(filter.icon)}</span>` : '';
      const titleAttr = !isSupported ? `title="${escapeAttr(disabledReason)}"` : '';
      const ariaDisabled = !isSupported ? 'aria-disabled="true"' : '';
      const ariaCurrent = isActive ? 'aria-current="true"' : '';
      const state = !isSupported ? 'disabled' : (isActive ? 'active' : 'inactive');

      return `<span class="quick-filter quick-filter--${size} ${escapeAttr(filter.styleClass || '')}" data-quick-filter-value="${escapeAttr(filter.value)}" data-quick-filter-key="${escapeAttr(filter.key)}" data-tone="${escapeAttr(filter.tone || 'neutral')}" data-state="${state}" ${ariaDisabled} ${ariaCurrent} ${titleAttr}>${iconHtml}<span>${escapeHtml(filter.label)}</span></span>`;
    })
    .join('');

  return `<div class="quick-filters ${escapeAttr(containerClass)}" data-quick-filters role="group" aria-label="Quick filters">${filtersHtml}</div>`;
}

// ============================================================================
// Helper Functions
// ============================================================================
