// @ts-nocheck
import type { ApiResponse, DetailResponse } from './core-types.js';
import { httpRequest } from '../shared/transport/http-client.js';

export async function refresh(grid: any): Promise<void> {
    console.log('[DataGrid] ===== refresh() CALLED =====');
    console.log('[DataGrid] Current sort state:', JSON.stringify(grid.state.sort));

    if (grid.abortController) {
      grid.abortController.abort();
    }

    grid.abortController = new AbortController();

    try {
      const url = grid.buildApiUrl();
      const response = await httpRequest(url, {
        signal: grid.abortController.signal,
        method: 'GET',
        accept: 'application/json',
      });

      if (!response.ok) {
        if (grid.handleGroupedModeStatusFallback(response.status)) {
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      console.log('[DataGrid] API Response:', data);
      console.log('[DataGrid] API Response data array:', data.data);
      console.log('[DataGrid] API Response total:', data.total, 'count:', data.count, '$meta:', data.$meta);
      const items = data.data || data.records || [];
      if (grid.handleGroupedModePayloadFallback(items)) {
        return;
      }
      grid.lastSchema = data.schema || null;
      grid.lastForm = data.form || null;
      const total = grid.getResponseTotal(data);
      if (grid.normalizePagination(total)) {
        return grid.refresh();
      }
      console.log('[DataGrid] About to call renderData()...');
      grid.renderData(data);
      console.log('[DataGrid] renderData() completed');
      grid.updatePaginationUI(data);
      console.log('[DataGrid] ===== refresh() COMPLETED =====');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[DataGrid] Request aborted');
        return;
      }
      console.error('[DataGrid] Error fetching data:', error);
      grid.showError('Failed to load data');
    }
  }

  /**
   * Build API URL with all query parameters
   */
export function buildApiUrl(grid: any): string {
    const params = new URLSearchParams();
    const queryParams = grid.buildQueryParams();

    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.append(key, String(value));
      }
    });

    const url = `${grid.config.apiEndpoint}?${params.toString()}`;
    console.log(`[DataGrid] API URL: ${url}`);
    return url;
  }

  /**
   * Build query string (for exports, etc.)
   */
export function buildQueryString(grid: any): string {
    const params = new URLSearchParams();
    const queryParams = grid.buildQueryParams();

    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.append(key, String(value));
      }
    });

    return params.toString();
  }

  /**
   * Build query parameters from state using behaviors
   */
export function buildQueryParams(grid: any): Record<string, any> {
    const params: Record<string, any> = {};

    // Pagination
    if (grid.config.behaviors?.pagination) {
      const paginationParams = grid.config.behaviors.pagination.buildQuery(
        grid.state.currentPage,
        grid.state.perPage
      );
      Object.assign(params, paginationParams);
    }

    // Search
    if (grid.state.search && grid.config.behaviors?.search) {
      const searchParams = grid.config.behaviors.search.buildQuery(grid.state.search);
      Object.assign(params, searchParams);
    }

    // Filters
    if (grid.state.filters.length > 0 && grid.config.behaviors?.filter) {
      const filterParams = grid.config.behaviors.filter.buildFilters(grid.state.filters);
      Object.assign(params, filterParams);
    }

    // Sorting
    if (grid.state.sort.length > 0 && grid.config.behaviors?.sort) {
      const sortParams = grid.config.behaviors.sort.buildQuery(grid.state.sort);
      Object.assign(params, sortParams);
    }

    // Grouping (Phase 2 / TX-058)
    if (grid.isGroupedViewActive()) {
      params.group_by = grid.config.groupByField || 'translation_group_id';
    }

    return params;
  }

export function getResponseTotal(grid: any, data: ApiResponse): number | null {
    if (data.total !== undefined && data.total !== null) return data.total;
    if (data.$meta?.count !== undefined && data.$meta?.count !== null) return data.$meta.count;
    if (data.count !== undefined && data.count !== null) return data.count;
    return null;
  }

export function normalizePagination(grid: any, total: number | null): boolean {
    if (total === null) {
      return false;
    }

    const nextPerPage = Math.max(1, grid.state.perPage || grid.config.perPage || 10);
    const maxPage = Math.max(1, Math.ceil(total / nextPerPage));
    let nextPage = grid.state.currentPage;

    if (total === 0) {
      nextPage = 1;
    } else if (nextPage > maxPage) {
      nextPage = maxPage;
    } else if (nextPage < 1) {
      nextPage = 1;
    }

    const didCorrect = nextPerPage !== grid.state.perPage || nextPage !== grid.state.currentPage;
    if (didCorrect) {
      grid.state.perPage = nextPerPage;
      grid.state.currentPage = nextPage;
      grid.pushStateToURL();
    }

    if (total === 0) {
      return false;
    }

    return didCorrect;
  }


export async function fetchDetail(grid: any, id: string): Promise<{ data: any; schema?: Record<string, any>; form?: Record<string, any>; tabs?: any[] }> {
  const response = await httpRequest(`${grid.config.apiEndpoint}/${id}`, {
    method: 'GET',
    accept: 'application/json',
  });
  if (!response.ok) {
    throw new Error(`Detail request failed: ${response.status}`);
  }
  const payload = await response.json();
  const detail = grid.normalizeDetailResponse(payload);
  if (detail.schema) {
    grid.lastSchema = detail.schema;
  }
  if (detail.form) {
    grid.lastForm = detail.form;
  }
  return {
    ...detail,
    tabs: detail.schema?.tabs || [],
  };
}

export function normalizeDetailResponse(_grid: any, payload: any): { data: any; schema?: Record<string, any>; form?: Record<string, any> } {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const detail = payload as DetailResponse;
    return {
      data: detail.data,
      schema: detail.schema,
      form: detail.form,
    };
  }
  return { data: payload };
}

export function getSchema(grid: any): Record<string, any> | null {
  return grid.lastSchema;
}

export function getForm(grid: any): Record<string, any> | null {
  return grid.lastForm;
}

export function getTabs(grid: any): any[] {
  return grid.lastSchema?.tabs || [];
}
