import type { ExportBehavior } from '../behaviors/types';
import type { DataGrid } from '../core';

/**
 * go-crud export behavior
 * Uses custom action endpoint for exports
 */
export class GoCrudExportBehavior implements ExportBehavior {
  constructor(
    private baseEndpoint: string,
    private actionSlug: string = 'export'
  ) {}

  getEndpoint(): string {
    // Custom action endpoint pattern: /admin/crud/users/actions/export
    const plural = this.getPluralEndpoint();
    return `${plural}/actions/${this.actionSlug}`;
  }

  private getPluralEndpoint(): string {
    // If baseEndpoint ends with singular form, convert to plural
    // This is a simple heuristic - may need adjustment based on actual naming
    if (this.baseEndpoint.endsWith('s')) {
      return this.baseEndpoint;
    }
    return `${this.baseEndpoint}s`;
  }

  async export(format: 'csv' | 'excel' | 'pdf', grid: DataGrid): Promise<void> {
    // Build current query string with all filters, search, etc.
    const currentQuery = grid.buildQueryString();

    // Construct export URL
    const url = `${this.getEndpoint()}?format=${format}&${currentQuery}`;

    // Trigger download by navigating to the URL
    window.location.href = url;
  }
}
