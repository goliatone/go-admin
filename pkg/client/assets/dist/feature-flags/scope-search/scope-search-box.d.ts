/**
 * Scope Search Box
 * Specialized search box for feature flags scope selection
 * Switches resolver/renderer based on selected scope type
 */
import type { SearchResult } from '../../searchbox/types.js';
import type { ScopeSearchBoxConfig, ScopeConfig, ScopeType } from './types.js';
export declare class ScopeSearchBox {
    private config;
    private input;
    private scopeSelect;
    private container;
    private searchBox;
    private scopeConfigs;
    private currentScope;
    private selectedResult;
    constructor(config: ScopeSearchBoxConfig);
    /**
     * Initialize the scope search box
     */
    init(): void;
    /**
     * Destroy and clean up
     */
    destroy(): void;
    /**
     * Get the currently selected scope type
     */
    getScope(): ScopeType;
    /**
     * Get the currently selected scope ID
     */
    getScopeId(): string;
    /**
     * Get the selected result data
     */
    getSelectedResult(): SearchResult | null;
    /**
     * Programmatically set the scope
     */
    setScope(scope: ScopeType): void;
    /**
     * Programmatically set the scope ID
     */
    setScopeId(id: string): void;
    /**
     * Clear the scope ID
     */
    clear(): void;
    private bindScopeSelect;
    private updateForScope;
    private getDefaultPlaceholder;
}
/**
 * Create default scope configs for common go-admin setup
 * Uses go-crud endpoints for tenants, orgs, and users
 */
export declare function createDefaultScopeConfigs(basePath: string): ScopeConfig[];
/**
 * Factory function to create ScopeSearchBox with common defaults
 */
export declare function createScopeSearchBox(options: {
    inputSelector: string;
    scopeSelectSelector: string;
    containerSelector?: string;
    basePath: string;
    customConfigs?: Partial<Record<ScopeType, Partial<ScopeConfig>>>;
    onSelect?: (scope: ScopeType, result: SearchResult) => void;
    onScopeChange?: (scope: ScopeType) => void;
}): ScopeSearchBox;
//# sourceMappingURL=scope-search-box.d.ts.map