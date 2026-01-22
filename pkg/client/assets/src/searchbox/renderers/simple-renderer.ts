/**
 * Simple Renderer
 * Basic renderer for search results with label and optional description
 */

import type { SearchResult, ResultRenderer, SimpleRendererConfig } from '../types.js';

const DEFAULT_CONFIG: SimpleRendererConfig = {
  showDescription: true,
  showIcon: true,
  itemClass: 'px-4 py-3 hover:bg-gray-50',
  selectedClass: 'bg-blue-50',
};

export class SimpleRenderer<T = unknown> implements ResultRenderer<T> {
  protected config: SimpleRendererConfig;

  constructor(config: Partial<SimpleRendererConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  render(result: SearchResult<T>, isSelected: boolean): string {
    const baseClass = this.config.itemClass || '';
    const selectedClass = isSelected ? this.config.selectedClass || '' : '';
    const className = `${baseClass} ${selectedClass}`.trim();

    const iconHtml = this.config.showIcon && result.icon ? this.renderIcon(result.icon) : '';
    const labelHtml = this.escapeHtml(result.label);
    const descriptionHtml =
      this.config.showDescription && result.description
        ? `<p class="text-xs text-gray-500 mt-0.5">${this.escapeHtml(result.description)}</p>`
        : '';

    return `
      <div class="${className}">
        <div class="flex items-center gap-3">
          ${iconHtml}
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">${labelHtml}</p>
            ${descriptionHtml}
          </div>
        </div>
      </div>
    `;
  }

  protected renderIcon(icon: string): string {
    // Check if it's a URL (for images)
    if (icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:')) {
      return `<img src="${this.escapeHtml(icon)}" class="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />`;
    }

    // Otherwise treat as an icon name/class
    return `<span class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-500">${this.escapeHtml(icon)}</span>`;
  }

  protected escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
