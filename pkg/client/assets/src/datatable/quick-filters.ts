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
  /** CSS class for styling */
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
    styleClass: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    description: 'Show all records',
  },
  {
    key: 'ready',
    label: 'Ready',
    field: 'readiness_state',
    value: 'ready',
    icon: '●',
    styleClass: 'bg-green-100 text-green-700 hover:bg-green-200',
    description: 'All translations complete',
  },
  {
    key: 'missing_locales',
    label: 'Missing',
    field: 'readiness_state',
    value: 'missing_locales',
    icon: '○',
    styleClass: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
    description: 'Missing required locale translations',
  },
  {
    key: 'missing_fields',
    label: 'Incomplete',
    field: 'readiness_state',
    value: 'missing_fields',
    icon: '◐',
    styleClass: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
    description: 'Has translations but missing required fields',
  },
  {
    key: 'fallback',
    label: 'Fallback',
    field: 'fallback_used',
    value: 'true',
    icon: '⚠',
    styleClass: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
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
      console.warn('[QuickFilters] Container not found');
      return;
    }

    const { size = 'default', containerClass = '' } = this.config;
    const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
    const padding = size === 'sm' ? 'px-2 py-1' : 'px-3 py-1.5';

    const filtersHtml = this.config.filters
      .map((filter) => this.renderFilterButton(filter, textSize, padding))
      .join('');

    this.container.innerHTML = `
      <div class="quick-filters inline-flex items-center gap-2 flex-wrap ${containerClass}"
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
  private renderFilterButton(filter: QuickFilter, textSize: string, padding: string): string {
    const capability = this.state.capabilities.get(filter.key);
    const isSupported = capability?.supported !== false;
    const isActive = this.state.activeKey === filter.key;
    const disabledReason = capability?.disabledReason || 'Filter not available';

    const baseClasses = `inline-flex items-center gap-1 ${padding} ${textSize} rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500`;

    let stateClasses: string;
    let ariaAttributes: string;

    if (!isSupported) {
      // Disabled state with visible reason
      stateClasses = 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60';
      ariaAttributes = `aria-disabled="true" title="${escapeAttr(disabledReason)}"`;
    } else if (isActive) {
      // Active state
      stateClasses = `${filter.styleClass || 'bg-blue-100 text-blue-700'} ring-2 ring-offset-1 ring-blue-500`;
      ariaAttributes = 'aria-pressed="true"';
    } else {
      // Normal state
      stateClasses = filter.styleClass || 'bg-gray-100 text-gray-700 hover:bg-gray-200';
      ariaAttributes = 'aria-pressed="false"';
    }

    const iconHtml = filter.icon
      ? `<span aria-hidden="true">${filter.icon}</span>`
      : '';

    return `
      <button type="button"
              class="quick-filter-btn ${baseClasses} ${stateClasses}"
              data-filter-key="${escapeAttr(filter.key)}"
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

    const buttons = this.container.querySelectorAll<HTMLButtonElement>('.quick-filter-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.filterKey;
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
      console.warn(`[QuickFilters] Filter not found: ${key}`);
      return;
    }

    const capability = this.state.capabilities.get(key);
    if (capability?.supported === false) {
      console.warn(`[QuickFilters] Filter not supported: ${key}`);
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

  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const padding = size === 'sm' ? 'px-2 py-1' : 'px-3 py-1.5';

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

      const baseClasses = `inline-flex items-center gap-1 ${padding} ${textSize} rounded-full font-medium`;

      let stateClasses: string;
      if (!isSupported) {
        stateClasses = 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60';
      } else if (isActive) {
        stateClasses = `${filter.styleClass || 'bg-blue-100 text-blue-700'} ring-2 ring-offset-1 ring-blue-500`;
      } else {
        stateClasses = filter.styleClass || 'bg-gray-100 text-gray-700';
      }

      const iconHtml = filter.icon ? `<span>${filter.icon}</span>` : '';
      const titleAttr = !isSupported ? `title="${escapeAttr(disabledReason)}"` : '';

      return `<span class="${baseClasses} ${stateClasses}" ${titleAttr}>${iconHtml}<span>${escapeHtml(filter.label)}</span></span>`;
    })
    .join('');

  return `<div class="quick-filters inline-flex items-center gap-2 flex-wrap ${containerClass}">${filtersHtml}</div>`;
}

// ============================================================================
// Helper Functions
// ============================================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str: string): string {
  return escapeHtml(str);
}
