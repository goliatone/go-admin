import type { BulkActionBehavior } from '../behaviors/types';
import type { DataGrid } from '../core';

/**
 * go-crud bulk action behavior
 * Uses custom action endpoints for bulk operations
 */
export class GoCrudBulkActionBehavior implements BulkActionBehavior {
  constructor(private baseEndpoint: string) {}

  getActionEndpoint(action: string): string {
    // Custom action endpoint pattern: /admin/crud/users/actions/{action}
    const plural = this.getPluralEndpoint();
    return `${plural}/actions/${action}`;
  }

  private getPluralEndpoint(): string {
    // If baseEndpoint ends with singular form, convert to plural
    if (this.baseEndpoint.endsWith('s')) {
      return this.baseEndpoint;
    }
    return `${this.baseEndpoint}s`;
  }

  async execute(action: string, ids: string[], grid: DataGrid): Promise<void> {
    const endpoint = this.getActionEndpoint(action);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bulk action '${action}' failed: ${errorText}`);
    }

    // Refresh grid after successful bulk action
    await grid.refresh();
  }
}
