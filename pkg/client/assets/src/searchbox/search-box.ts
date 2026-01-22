/**
 * SearchBox Component
 * A generic, reusable typeahead search component with pluggable resolver and renderer
 */

import type {
  SearchBoxConfig,
  SearchBoxState,
  SearchResult,
  SearchResolver,
  ResultRenderer,
} from './types.js';

const DEFAULT_CONFIG = {
  minChars: 2,
  debounceMs: 300,
  placeholder: 'Search...',
  emptyText: 'No results found',
  loadingText: 'Searching...',
  maxResults: 10,
  dropdownClass: '',
};

export class SearchBox<T = unknown> {
  protected config: Required<
    Pick<SearchBoxConfig<T>, 'minChars' | 'debounceMs' | 'placeholder' | 'emptyText' | 'loadingText' | 'maxResults' | 'dropdownClass'>
  > &
    SearchBoxConfig<T>;
  protected input: HTMLInputElement;
  protected container: HTMLElement;
  protected dropdown: HTMLElement | null = null;
  protected state: SearchBoxState<T>;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private abortController: AbortController | null = null;
  private documentClickHandler: ((e: MouseEvent) => void) | null = null;

  constructor(config: SearchBoxConfig<T>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Resolve input element
    if (typeof config.input === 'string') {
      const el = document.querySelector<HTMLInputElement>(config.input);
      if (!el) throw new Error(`SearchBox: Input element not found: ${config.input}`);
      this.input = el;
    } else {
      this.input = config.input;
    }

    // Resolve container
    if (config.container) {
      if (typeof config.container === 'string') {
        const el = document.querySelector<HTMLElement>(config.container);
        if (!el) throw new Error(`SearchBox: Container element not found: ${config.container}`);
        this.container = el;
      } else {
        this.container = config.container;
      }
    } else {
      this.container = this.input.parentElement || document.body;
    }

    // Initialize state
    this.state = {
      query: '',
      results: [],
      selectedIndex: -1,
      isOpen: false,
      isLoading: false,
      error: null,
    };
  }

  /**
   * Initialize the search box
   */
  init(): void {
    this.createDropdown();
    this.bindEvents();
    if (this.config.placeholder) {
      this.input.placeholder = this.config.placeholder;
    }
  }

  /**
   * Destroy the search box and clean up
   */
  destroy(): void {
    this.cancelPendingSearch();
    this.removeDropdown();
    this.unbindEvents();
  }

  /**
   * Get the current resolver
   */
  getResolver(): SearchResolver<T> {
    return this.config.resolver;
  }

  /**
   * Set a new resolver
   */
  setResolver(resolver: SearchResolver<T>): void {
    this.config.resolver = resolver;
    this.clear();
  }

  /**
   * Get the current renderer
   */
  getRenderer(): ResultRenderer<T> {
    return this.config.renderer;
  }

  /**
   * Set a new renderer
   */
  setRenderer(renderer: ResultRenderer<T>): void {
    this.config.renderer = renderer;
    if (this.state.results.length > 0) {
      this.renderResults();
    }
  }

  /**
   * Clear the search box
   */
  clear(): void {
    this.input.value = '';
    this.state.query = '';
    this.state.results = [];
    this.state.selectedIndex = -1;
    this.state.error = null;
    this.closeDropdown();
    this.config.onClear?.();
  }

  /**
   * Get the current selected result
   */
  getSelectedResult(): SearchResult<T> | null {
    if (this.state.selectedIndex >= 0 && this.state.selectedIndex < this.state.results.length) {
      return this.state.results[this.state.selectedIndex];
    }
    return null;
  }

  /**
   * Get current state (readonly copy)
   */
  getState(): Readonly<SearchBoxState<T>> {
    return { ...this.state };
  }

  /**
   * Programmatically trigger a search
   */
  async search(query: string): Promise<void> {
    this.input.value = query;
    await this.performSearch(query);
  }

  /**
   * Set the input value without triggering search
   */
  setValue(value: string): void {
    this.input.value = value;
    this.state.query = value;
  }

  protected createDropdown(): void {
    this.dropdown = document.createElement('div');
    this.dropdown.className = `searchbox-dropdown absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden hidden ${this.config.dropdownClass}`;
    this.dropdown.setAttribute('role', 'listbox');
    this.dropdown.setAttribute('aria-label', 'Search results');

    // Ensure container has relative positioning
    const containerPosition = getComputedStyle(this.container).position;
    if (containerPosition === 'static') {
      this.container.style.position = 'relative';
    }

    this.container.appendChild(this.dropdown);
  }

  protected removeDropdown(): void {
    if (this.dropdown) {
      this.dropdown.remove();
      this.dropdown = null;
    }
  }

  protected bindEvents(): void {
    this.input.addEventListener('input', this.handleInput);
    this.input.addEventListener('keydown', this.handleKeydown);
    this.input.addEventListener('focus', this.handleFocus);

    // Close dropdown when clicking outside
    this.documentClickHandler = (e: MouseEvent) => {
      if (!this.container.contains(e.target as Node)) {
        this.closeDropdown();
      }
    };
    document.addEventListener('click', this.documentClickHandler);
  }

  protected unbindEvents(): void {
    this.input.removeEventListener('input', this.handleInput);
    this.input.removeEventListener('keydown', this.handleKeydown);
    this.input.removeEventListener('focus', this.handleFocus);

    if (this.documentClickHandler) {
      document.removeEventListener('click', this.documentClickHandler);
      this.documentClickHandler = null;
    }
  }

  protected handleInput = (): void => {
    const query = this.input.value.trim();
    this.state.query = query;

    if (query.length < this.config.minChars) {
      this.state.results = [];
      this.closeDropdown();
      return;
    }

    this.debouncedSearch(query);
  };

  protected handleKeydown = (e: KeyboardEvent): void => {
    if (!this.state.isOpen) {
      if (e.key === 'ArrowDown' && this.state.results.length > 0) {
        e.preventDefault();
        this.openDropdown();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.moveSelection(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.moveSelection(-1);
        break;
      case 'Enter':
        e.preventDefault();
        this.selectCurrent();
        break;
      case 'Escape':
        e.preventDefault();
        this.closeDropdown();
        break;
      case 'Tab':
        this.closeDropdown();
        break;
    }
  };

  protected handleFocus = (): void => {
    if (this.state.results.length > 0 && this.state.query.length >= this.config.minChars) {
      this.openDropdown();
    }
  };

  protected debouncedSearch(query: string): void {
    this.cancelPendingSearch();

    this.debounceTimer = setTimeout(() => {
      this.performSearch(query);
    }, this.config.debounceMs);
  }

  protected async performSearch(query: string): Promise<void> {
    this.cancelPendingSearch();

    if (query.length < this.config.minChars) {
      return;
    }

    this.state.isLoading = true;
    this.state.error = null;
    this.config.onSearchStart?.(query);
    this.renderLoading();
    this.openDropdown();

    this.abortController = new AbortController();

    try {
      let results = await this.config.resolver.search(query, this.abortController.signal);

      // Limit results
      if (results.length > this.config.maxResults) {
        results = results.slice(0, this.config.maxResults);
      }

      this.state.results = results;
      this.state.selectedIndex = results.length > 0 ? 0 : -1;
      this.state.isLoading = false;

      this.renderResults();
      this.config.onSearchComplete?.(results);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return; // Search was cancelled, ignore
      }

      this.state.error = error as Error;
      this.state.isLoading = false;
      this.renderError();
      this.config.onError?.(error as Error);
    }
  }

  protected cancelPendingSearch(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  protected moveSelection(delta: number): void {
    const { results, selectedIndex } = this.state;
    if (results.length === 0) return;

    let newIndex = selectedIndex + delta;
    if (newIndex < 0) newIndex = results.length - 1;
    if (newIndex >= results.length) newIndex = 0;

    this.state.selectedIndex = newIndex;
    this.renderResults();
    this.scrollToSelected();
  }

  protected selectCurrent(): void {
    const result = this.getSelectedResult();
    if (result) {
      this.selectResult(result);
    }
  }

  protected selectResult(result: SearchResult<T>): void {
    this.input.value = result.label;
    this.state.query = result.label;
    this.closeDropdown();
    this.config.onSelect?.(result);
  }

  protected openDropdown(): void {
    if (!this.dropdown) return;
    this.state.isOpen = true;
    this.dropdown.classList.remove('hidden');
  }

  protected closeDropdown(): void {
    if (!this.dropdown) return;
    this.state.isOpen = false;
    this.dropdown.classList.add('hidden');
  }

  protected renderLoading(): void {
    if (!this.dropdown) return;
    this.dropdown.innerHTML = `
      <div class="searchbox-loading px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
        <svg class="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        ${this.escapeHtml(this.config.loadingText)}
      </div>
    `;
  }

  protected renderError(): void {
    if (!this.dropdown) return;
    const message = this.state.error?.message || 'An error occurred';
    this.dropdown.innerHTML = `
      <div class="searchbox-error px-4 py-3 text-sm text-red-600 flex items-center gap-2">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        ${this.escapeHtml(message)}
      </div>
    `;
  }

  protected renderResults(): void {
    if (!this.dropdown) return;

    const { results, selectedIndex } = this.state;

    if (results.length === 0) {
      this.dropdown.innerHTML = `
        <div class="searchbox-empty px-4 py-3 text-sm text-gray-500">
          ${this.escapeHtml(this.config.emptyText)}
        </div>
      `;
      return;
    }

    const items = results.map((result, index) => {
      const isSelected = index === selectedIndex;
      const html = this.config.renderer.render(result, isSelected);
      return `
        <div
          class="searchbox-item cursor-pointer"
          data-index="${index}"
          role="option"
          aria-selected="${isSelected}"
        >
          ${html}
        </div>
      `;
    });

    this.dropdown.innerHTML = items.join('');

    // Bind click handlers
    this.dropdown.querySelectorAll('.searchbox-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt((item as HTMLElement).dataset.index || '0', 10);
        const result = results[index];
        if (result) {
          this.selectResult(result);
        }
      });
    });
  }

  protected scrollToSelected(): void {
    if (!this.dropdown) return;
    const selected = this.dropdown.querySelector('[aria-selected="true"]');
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }

  protected escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
