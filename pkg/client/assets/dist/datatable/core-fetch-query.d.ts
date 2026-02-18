import type { ApiResponse } from './core-types.js';
export declare function refresh(grid: any): Promise<void>;
/**
 * Build API URL with all query parameters
 */
export declare function buildApiUrl(grid: any): string;
/**
 * Build query string (for exports, etc.)
 */
export declare function buildQueryString(grid: any): string;
/**
 * Build query parameters from state using behaviors
 */
export declare function buildQueryParams(grid: any): Record<string, any>;
export declare function getResponseTotal(grid: any, data: ApiResponse): number | null;
export declare function normalizePagination(grid: any, total: number | null): boolean;
export declare function fetchDetail(grid: any, id: string): Promise<{
    data: any;
    schema?: Record<string, any>;
    form?: Record<string, any>;
    tabs?: any[];
}>;
export declare function normalizeDetailResponse(_grid: any, payload: any): {
    data: any;
    schema?: Record<string, any>;
    form?: Record<string, any>;
};
export declare function getSchema(grid: any): Record<string, any> | null;
export declare function getForm(grid: any): Record<string, any> | null;
export declare function getTabs(grid: any): any[];
//# sourceMappingURL=core-fetch-query.d.ts.map