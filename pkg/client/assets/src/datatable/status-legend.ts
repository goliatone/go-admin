/**
 * Translation Status Legend Component
 *
 * Provides a visual legend for translation status indicators in content list views.
 * Shows readiness states using consistent iconography across the admin panel.
 *
 * Contract:
 * - ● ready: All required translations complete
 * - ◐ incomplete: Has translations but missing required fields
 * - ○ missing: Missing required locale translations
 * - ⚠ fallback/stale: Viewing fallback content or stale data
 *
 * Phase 1 behavior:
 * - Always visible in list toolbar
 * - Non-collapsible
 * - No persisted user preference
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Status legend item definition
 */
export interface StatusLegendItem {
  /** Unique status key */
  key: string;
  /** Display label */
  label: string;
  /** Icon character or SVG */
  icon: string;
  /** CSS color class for the icon */
  colorClass: string;
  /** Tooltip/description */
  description: string;
}

/**
 * Status legend configuration
 */
export interface StatusLegendConfig {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Additional CSS classes for the legend container */
  containerClass?: string;
  /** Legend title (optional) */
  title?: string;
  /** Orientation: horizontal (default) or vertical */
  orientation?: 'horizontal' | 'vertical';
  /** Size variant */
  size?: 'sm' | 'default';
  /** Items to display (uses defaults if not provided) */
  items?: StatusLegendItem[];
}

// ============================================================================
// Default Legend Items
// ============================================================================

/**
 * Default translation status legend items per contract
 */
export const DEFAULT_STATUS_LEGEND_ITEMS: StatusLegendItem[] = [
  {
    key: 'ready',
    label: 'Ready',
    icon: '●',
    colorClass: 'text-green-500',
    description: 'All required translations are complete',
  },
  {
    key: 'incomplete',
    label: 'Incomplete',
    icon: '◐',
    colorClass: 'text-amber-500',
    description: 'Has translations but missing required fields',
  },
  {
    key: 'missing',
    label: 'Missing',
    icon: '○',
    colorClass: 'text-red-500',
    description: 'Missing required locale translations',
  },
  {
    key: 'fallback',
    label: 'Fallback',
    icon: '⚠',
    colorClass: 'text-amber-600',
    description: 'Viewing fallback content or stale data',
  },
];

// ============================================================================
// Status Legend Component
// ============================================================================

/**
 * @deprecated Since v2.x - status icons are now inline in quick filters.
 * Retained for compatibility with existing custom templates; planned removal in v3.0.
 */
export class StatusLegend {
  private container: HTMLElement | null = null;
  private config: Required<Omit<StatusLegendConfig, 'container'>> & { container: HTMLElement | null };

  constructor(config: StatusLegendConfig) {
    const containerEl = typeof config.container === 'string'
      ? document.querySelector<HTMLElement>(config.container)
      : config.container;

    this.config = {
      container: containerEl,
      containerClass: config.containerClass || '',
      title: config.title || '',
      orientation: config.orientation || 'horizontal',
      size: config.size || 'default',
      items: config.items || DEFAULT_STATUS_LEGEND_ITEMS,
    };

    this.container = containerEl;
  }

  /**
   * Render the legend into the container
   */
  render(): void {
    if (!this.container) {
      console.warn('[StatusLegend] Container not found');
      return;
    }

    this.container.innerHTML = this.buildHTML();
  }

  /**
   * Build HTML for the legend
   */
  buildHTML(): string {
    const { title, orientation, size, items, containerClass } = this.config;
    const isVertical = orientation === 'vertical';
    const isSmall = size === 'sm';

    const flexDirection = isVertical ? 'flex-col' : 'flex-row flex-wrap';
    const gap = isSmall ? 'gap-2' : 'gap-4';
    const textSize = isSmall ? 'text-xs' : 'text-sm';
    const iconSize = isSmall ? 'text-sm' : 'text-base';

    const titleHtml = title
      ? `<span class="font-medium text-gray-600 dark:text-gray-400 mr-2 ${textSize}">${this.escapeHtml(title)}</span>`
      : '';

    const itemsHtml = items.map(item => this.renderItem(item, iconSize, textSize)).join('');

    return `
      <div class="status-legend inline-flex items-center ${flexDirection} ${gap} ${containerClass}"
           role="list"
           aria-label="Translation status legend">
        ${titleHtml}
        ${itemsHtml}
      </div>
    `;
  }

  /**
   * Render a single legend item
   */
  private renderItem(item: StatusLegendItem, iconSize: string, textSize: string): string {
    return `
      <div class="status-legend-item inline-flex items-center gap-1"
           role="listitem"
           title="${this.escapeHtml(item.description)}"
           aria-label="${this.escapeHtml(item.label)}: ${this.escapeHtml(item.description)}">
        <span class="${item.colorClass} ${iconSize}" aria-hidden="true">${item.icon}</span>
        <span class="text-gray-600 dark:text-gray-400 ${textSize}">${this.escapeHtml(item.label)}</span>
      </div>
    `;
  }

  /**
   * Update items and re-render
   */
  setItems(items: StatusLegendItem[]): void {
    this.config.items = items;
    this.render();
  }

  /**
   * Destroy the legend
   */
  destroy(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.container = null;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(str: string): string {
    // Use string replacement instead of DOM for Node.js test compatibility
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create and render a status legend
 */
export function createStatusLegend(config: StatusLegendConfig): StatusLegend {
  const legend = new StatusLegend(config);
  legend.render();
  return legend;
}

/**
 * Initialize status legend on elements with data-status-legend attribute
 */
export function initStatusLegends(): StatusLegend[] {
  const elements = document.querySelectorAll<HTMLElement>('[data-status-legend]');
  const legends: StatusLegend[] = [];

  elements.forEach((el) => {
    // Skip if already initialized
    if (el.hasAttribute('data-status-legend-init')) {
      return;
    }

    const orientation = (el.dataset.orientation as 'horizontal' | 'vertical') || 'horizontal';
    const size = (el.dataset.size as 'sm' | 'default') || 'default';
    const title = el.dataset.title || '';

    const legend = createStatusLegend({
      container: el,
      orientation,
      size,
      title,
    });

    el.setAttribute('data-status-legend-init', 'true');
    legends.push(legend);
  });

  return legends;
}

/**
 * Render inline legend HTML for embedding in templates
 */
export function renderStatusLegendHTML(options: {
  title?: string;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'default';
  items?: StatusLegendItem[];
  containerClass?: string;
} = {}): string {
  // Create a temporary legend instance to generate HTML
  const tempContainer = document.createElement('div');
  const legend = new StatusLegend({
    container: tempContainer,
    ...options,
  });
  return legend.buildHTML();
}
