/**
 * Static Resolver
 * Searches through a static list of items in memory
 */

import type { SearchResult, SearchResolver, StaticResolverConfig } from '../types.js';

const DEFAULT_CONFIG = {
  searchFields: ['label', 'description'] as (keyof SearchResult)[],
  caseSensitive: false,
};

export class StaticResolver<T = unknown> implements SearchResolver<T> {
  private config: Required<Pick<StaticResolverConfig<T>, 'searchFields' | 'caseSensitive'>> &
    StaticResolverConfig<T>;
  private items: SearchResult<T>[];

  constructor(config: StaticResolverConfig<T>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.items = config.items;
  }

  async search(query: string, _signal?: AbortSignal): Promise<SearchResult<T>[]> {
    const searchQuery = this.config.caseSensitive ? query : query.toLowerCase();

    return this.items.filter((item) => {
      return this.config.searchFields.some((field) => {
        const value = item[field];
        if (value === undefined || value === null) return false;

        const strValue = String(value);
        const compareValue = this.config.caseSensitive ? strValue : strValue.toLowerCase();
        return compareValue.includes(searchQuery);
      });
    });
  }

  /**
   * Update the items to search
   */
  setItems(items: SearchResult<T>[]): void {
    this.items = items;
  }

  /**
   * Add items to the list
   */
  addItems(items: SearchResult<T>[]): void {
    this.items = [...this.items, ...items];
  }

  /**
   * Remove an item by ID
   */
  removeItem(id: string): void {
    this.items = this.items.filter((item) => item.id !== id);
  }

  /**
   * Get all items
   */
  getItems(): SearchResult<T>[] {
    return [...this.items];
  }
}

/**
 * Create a static resolver from an array of simple objects
 */
export function createStaticResolver<T extends { id?: string; name?: string; label?: string }>(
  items: T[],
  options?: {
    labelField?: keyof T;
    descriptionField?: keyof T;
    idField?: keyof T;
  }
): StaticResolver<T> {
  const labelField = options?.labelField || 'name' as keyof T;
  const idField = options?.idField || 'id' as keyof T;

  const searchResults: SearchResult<T>[] = items.map((item) => ({
    id: String(item[idField] || ''),
    label: String(item[labelField] || item['label' as keyof T] || ''),
    description: options?.descriptionField ? String(item[options.descriptionField] || '') : undefined,
    data: item,
  }));

  return new StaticResolver<T>({ items: searchResults });
}
