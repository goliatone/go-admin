/**
 * go-crud pagination behavior
 * Uses limit/offset query parameters
 */
export class GoCrudPaginationBehavior {
    buildQuery(page, perPage) {
        return {
            limit: perPage,
            offset: (page - 1) * perPage
        };
    }
    async onPageChange(page, grid) {
        await grid.refresh();
    }
}
//# sourceMappingURL=pagination.js.map