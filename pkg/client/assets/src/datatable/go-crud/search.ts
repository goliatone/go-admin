import type { SearchBehavior } from '../behaviors/types.js';
import type { DataGrid } from '../core.js';

/**
 * go-crud search behavior
 * Builds OR queries across multiple fields using __ilike operator
 */
export class GoCrudSearchBehavior implements SearchBehavior {
  constructor(private searchableFields: string[]) {
    if (!searchableFields || searchableFields.length === 0) {
      throw new Error('At least one searchable field is required');
    }
  }

  buildQuery(term: string): Record<string, any> {
    if (!term || term.trim() === '') {
      return {};
    }

    const params: Record<string, any> = {};
    const trimmedTerm = term.trim();

    // Build OR query: ?name__ilike=%term%&email__ilike=%term%
    // Note: go-crud will OR these together when multiple fields match the same operator pattern
    this.searchableFields.forEach(field => {
      params[`${field}__ilike`] = `%${trimmedTerm}%`;
    });

    return params;
  }

  async onSearch(term: string, grid: DataGrid): Promise<void> {
    // Reset to first page when searching
    grid.resetPagination();
    await grid.refresh();
  }
}
