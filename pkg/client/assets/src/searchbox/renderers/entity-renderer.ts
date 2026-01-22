/**
 * Entity Renderer
 * Specialized renderer for generic entity results with badges and metadata pills
 */

import type { SearchResult, ResultRenderer, EntityRendererConfig } from '../types.js';

const DEFAULT_CONFIG: EntityRendererConfig = {
  showDescription: true,
  showIcon: true,
  itemClass: 'px-4 py-3 hover:bg-gray-50',
  selectedClass: 'bg-blue-50',
  badgeField: 'status',
  badgeColors: {
    active: 'bg-green-100 text-green-800',
    enabled: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-600',
    disabled: 'bg-gray-100 text-gray-600',
    pending: 'bg-yellow-100 text-yellow-800',
    draft: 'bg-blue-100 text-blue-800',
    archived: 'bg-red-100 text-red-800',
    default: 'bg-gray-100 text-gray-600',
  },
  metadataFields: [],
};

export class EntityRenderer<T = unknown> implements ResultRenderer<T> {
  protected config: EntityRendererConfig;

  constructor(config: Partial<EntityRendererConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      badgeColors: { ...DEFAULT_CONFIG.badgeColors, ...config.badgeColors },
    };
  }

  render(result: SearchResult<T>, isSelected: boolean): string {
    const baseClass = this.config.itemClass || '';
    const selectedClass = isSelected ? this.config.selectedClass || '' : '';
    const className = `${baseClass} ${selectedClass}`.trim();

    const metadata = result.metadata || {};
    const badgeValue = this.config.badgeField ? this.getMetadataValue(metadata, this.config.badgeField) : undefined;

    const iconHtml = this.config.showIcon ? this.renderIcon(result.icon, result.label) : '';
    const badgeHtml = badgeValue ? this.renderBadge(badgeValue) : '';
    const metadataPillsHtml = this.renderMetadataPills(metadata);
    const descriptionHtml =
      this.config.showDescription && result.description
        ? `<p class="text-xs text-gray-500 mt-0.5 truncate">${this.escapeHtml(result.description)}</p>`
        : '';

    return `
      <div class="${className}">
        <div class="flex items-center gap-3">
          ${iconHtml}
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(result.label)}</p>
              ${badgeHtml}
            </div>
            ${descriptionHtml}
            ${metadataPillsHtml}
          </div>
        </div>
      </div>
    `;
  }

  protected renderIcon(icon: string | undefined, label: string): string {
    if (icon) {
      // Check if it's a URL
      if (icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:')) {
        return `<img src="${this.escapeHtml(icon)}" class="w-10 h-10 rounded-lg object-cover flex-shrink-0" alt="" />`;
      }
      // Otherwise it's an emoji or icon class
      return `<span class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-lg">${this.escapeHtml(icon)}</span>`;
    }

    // Generate placeholder with first letter
    const initial = label.charAt(0).toUpperCase();
    const bgColor = this.getColorForLabel(label);

    return `
      <div class="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-sm font-semibold" style="background-color: ${bgColor}">
        ${this.escapeHtml(initial)}
      </div>
    `;
  }

  protected renderBadge(value: string): string {
    const colorClass =
      this.config.badgeColors?.[value.toLowerCase()] || this.config.badgeColors?.default || 'bg-gray-100 text-gray-600';

    return `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}">${this.escapeHtml(value)}</span>`;
  }

  protected renderMetadataPills(metadata: Record<string, unknown>): string {
    if (!this.config.metadataFields || this.config.metadataFields.length === 0) {
      return '';
    }

    const pills = this.config.metadataFields
      .map((field) => {
        const value = this.getMetadataValue(metadata, field);
        if (!value) return null;

        // Format field name for display
        const fieldLabel = field.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());

        return `<span class="text-xs text-gray-400">${this.escapeHtml(fieldLabel)}: <span class="text-gray-600">${this.escapeHtml(value)}</span></span>`;
      })
      .filter(Boolean);

    if (pills.length === 0) return '';

    return `<div class="flex items-center gap-3 mt-1">${pills.join('')}</div>`;
  }

  protected getColorForLabel(label: string): string {
    const colors = [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#06B6D4', // cyan
      '#F97316', // orange
    ];

    let hash = 0;
    for (let i = 0; i < label.length; i++) {
      hash = label.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }

  protected getMetadataValue(metadata: Record<string, unknown>, field: string): string | undefined {
    const value = metadata[field];
    if (value === undefined || value === null) return undefined;
    return String(value);
  }

  protected escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
