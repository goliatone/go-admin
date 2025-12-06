/**
 * go-crud sort behavior
 * Uses order query parameter with comma-separated values
 */
export class GoCrudSortBehavior {
    buildQuery(columns) {
        if (!columns || columns.length === 0) {
            return {};
        }
        // Build order parameter: ?order=name asc,created_at desc
        const order = columns
            .map(col => `${col.field} ${col.direction}`)
            .join(',');
        return { order };
    }
    async onSort(column, direction, grid) {
        await grid.refresh();
    }
}
//# sourceMappingURL=sort.js.map