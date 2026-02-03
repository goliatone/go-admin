/**
 * SearchBox Component
 * A generic, reusable typeahead search component with pluggable resolver and renderer
 */
import type { SearchBoxConfig, SearchBoxState, SearchResult, SearchResolver, ResultRenderer } from './types.js';
export declare class SearchBox<T = unknown> {
    protected config: Required<Pick<SearchBoxConfig<T>, 'minChars' | 'debounceMs' | 'placeholder' | 'emptyText' | 'loadingText' | 'maxResults' | 'dropdownClass'>> & SearchBoxConfig<T>;
    protected input: HTMLInputElement;
    protected container: HTMLElement;
    protected dropdown: HTMLElement | null;
    protected state: SearchBoxState<T>;
    private debounceTimer;
    private abortController;
    private documentClickHandler;
    constructor(config: SearchBoxConfig<T>);
    /**
     * Initialize the search box
     */
    init(): void;
    /**
     * Destroy the search box and clean up
     */
    destroy(): void;
    /**
     * Get the current resolver
     */
    getResolver(): SearchResolver<T>;
    /**
     * Set a new resolver
     */
    setResolver(resolver: SearchResolver<T>): void;
    /**
     * Get the current renderer
     */
    getRenderer(): ResultRenderer<T>;
    /**
     * Set a new renderer
     */
    setRenderer(renderer: ResultRenderer<T>): void;
    /**
     * Clear the search box
     */
    clear(): void;
    /**
     * Get the current selected result
     */
    getSelectedResult(): SearchResult<T> | null;
    /**
     * Get current state (readonly copy)
     */
    getState(): Readonly<SearchBoxState<T>>;
    /**
     * Programmatically trigger a search
     */
    search(query: string): Promise<void>;
    /**
     * Set the input value without triggering search
     */
    setValue(value: string): void;
    protected createDropdown(): void;
    protected removeDropdown(): void;
    protected bindEvents(): void;
    protected unbindEvents(): void;
    protected handleInput: () => void;
    protected handleKeydown: (e: KeyboardEvent) => void;
    protected handleFocus: () => void;
    protected debouncedSearch(query: string): void;
    protected performSearch(query: string): Promise<void>;
    protected cancelPendingSearch(): void;
    protected moveSelection(delta: number): void;
    protected selectCurrent(): void;
    protected selectResult(result: SearchResult<T>): void;
    protected openDropdown(): void;
    protected closeDropdown(): void;
    protected renderLoading(): void;
    protected renderError(): void;
    protected renderResults(): void;
    protected scrollToSelected(): void;
    protected escapeHtml(text: string): string;
}
//# sourceMappingURL=search-box.d.ts.map