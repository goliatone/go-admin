import type { BulkActionBehavior } from '../behaviors/types.js';
import type { DataGrid } from '../core.js';
import { httpRequest, readHTTPError } from '../../shared/transport/http-client.js';

/**
 * go-crud bulk action behavior
 * Uses custom action endpoints for bulk operations
 */
export class GoCrudBulkActionBehavior implements BulkActionBehavior {
  constructor(private baseEndpoint: string) {}

  getActionEndpoint(action: string): string {
    // Bulk action endpoint pattern: /admin/crud/users/bulk/{action}
    const plural = this.getPluralEndpoint();
    return `${plural}/bulk/${action}`;
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

    const response = await httpRequest(endpoint, {
      method: 'POST',
      json: { ids },
      accept: 'application/json',
    });

    if (!response.ok) {
      const errorText = await readHTTPError(response, `Bulk action '${action}' failed`);
      throw new Error(`Bulk action '${action}' failed: ${errorText}`);
    }

    // Refresh grid after successful bulk action
    await grid.refresh();
  }
}
