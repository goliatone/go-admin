/**
 * API Resolver
 * Fetches search results from a REST API endpoint
 */

import type { SearchResult, SearchResolver, ApiResolverConfig } from '../types.js';

const DEFAULT_CONFIG = {
  queryParam: 'q',
  timeout: 5000,
  params: {},
  headers: {},
};

export class ApiResolver<T = unknown> implements SearchResolver<T> {
  private config: Required<Pick<ApiResolverConfig<T>, 'queryParam' | 'timeout' | 'params' | 'headers'>> &
    ApiResolverConfig<T>;

  constructor(config: ApiResolverConfig<T>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async search(query: string, signal?: AbortSignal): Promise<SearchResult<T>[]> {
    const url = this.buildUrl(query);

    const timeoutId = setTimeout(() => {
      if (signal && !signal.aborted) {
        // Signal abort from timeout
      }
    }, this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...this.config.headers,
        },
        signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.config.transform(data);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private buildUrl(query: string): string {
    const url = new URL(this.config.endpoint, window.location.origin);
    url.searchParams.set(this.config.queryParam, query);

    // Add additional params
    for (const [key, value] of Object.entries(this.config.params)) {
      url.searchParams.set(key, value);
    }

    return url.toString();
  }

  /**
   * Update the endpoint URL
   */
  setEndpoint(endpoint: string): void {
    this.config.endpoint = endpoint;
  }

  /**
   * Update additional query parameters
   */
  setParams(params: Record<string, string>): void {
    this.config.params = params;
  }

  /**
   * Update request headers
   */
  setHeaders(headers: Record<string, string>): void {
    this.config.headers = headers;
  }
}

/**
 * Create a resolver for go-crud list endpoints
 * Transforms standard go-crud pagination response to SearchResults
 */
export function createCrudResolver<T extends { id?: string; uuid?: string }>(
  endpoint: string,
  options: {
    labelField: keyof T | ((item: T) => string);
    descriptionField?: keyof T | ((item: T) => string);
    iconField?: keyof T;
    searchParam?: string;
    headers?: Record<string, string>;
  }
): ApiResolver<T> {
  return new ApiResolver<T>({
    endpoint,
    queryParam: options.searchParam || 'q',
    headers: options.headers,
    transform: (response: unknown) => {
      // go-crud returns { data: T[], meta: {...} }
      const data = (response as { data?: T[] }).data || (response as T[]);
      const items = Array.isArray(data) ? data : [];

      return items.map((item): SearchResult<T> => {
        const id = String(item.id || item.uuid || '');
        const label =
          typeof options.labelField === 'function'
            ? options.labelField(item)
            : String(item[options.labelField] || '');
        const description = options.descriptionField
          ? typeof options.descriptionField === 'function'
            ? options.descriptionField(item)
            : String(item[options.descriptionField] || '')
          : undefined;
        const icon = options.iconField ? String(item[options.iconField] || '') : undefined;

        return {
          id,
          label,
          description,
          icon,
          metadata: item as unknown as Record<string, unknown>,
          data: item,
        };
      });
    },
  });
}
