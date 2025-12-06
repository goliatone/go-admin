/**
 * go-crud filter behavior
 * Builds query parameters using go-crud's filter syntax
 */
export class GoCrudFilterBehavior {
    buildFilters(filters) {
        const params = {};
        filters.forEach(filter => {
            if (filter.value === null || filter.value === undefined || filter.value === '') {
                return;
            }
            const operator = filter.operator || 'eq';
            // For 'eq' operator, use plain field name: ?status=active
            // For others, use field__operator: ?age__gte=30
            const key = operator === 'eq' ? filter.column : `${filter.column}__${operator}`;
            params[key] = filter.value;
        });
        return params;
    }
    async onFilterChange(column, value, grid) {
        // Reset to first page when filtering changes
        grid.resetPagination();
        await grid.refresh();
    }
}
//# sourceMappingURL=filter.js.map