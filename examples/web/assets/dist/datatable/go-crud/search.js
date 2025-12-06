/**
 * go-crud search behavior
 * Builds OR queries across multiple fields using __ilike operator
 */
export class GoCrudSearchBehavior {
    constructor(searchableFields) {
        this.searchableFields = searchableFields;
        if (!searchableFields || searchableFields.length === 0) {
            throw new Error('At least one searchable field is required');
        }
    }
    buildQuery(term) {
        if (!term || term.trim() === '') {
            return {};
        }
        const params = {};
        const trimmedTerm = term.trim();
        // Build OR query: ?name__ilike=%term%&email__ilike=%term%
        // Note: go-crud will OR these together when multiple fields match the same operator pattern
        this.searchableFields.forEach(field => {
            params[`${field}__ilike`] = `%${trimmedTerm}%`;
        });
        return params;
    }
    async onSearch(term, grid) {
        // Reset to first page when searching
        grid.resetPagination();
        await grid.refresh();
    }
}
//# sourceMappingURL=search.js.map