/**
 * Scope Search Types
 * Types specific to the feature flags scope search functionality
 */
import type { SearchResolver, ResultRenderer, SearchResult } from '../../searchbox/types.js';
/**
 * Supported scope types
 */
export type ScopeType = 'system' | 'tenant' | 'org' | 'user';
/**
 * Configuration for a single scope type
 */
export interface ScopeConfig<T = unknown> {
    /** The scope type this config applies to */
    scope: ScopeType;
    /** Resolver for this scope */
    resolver: SearchResolver<T>;
    /** Renderer for this scope's results */
    renderer: ResultRenderer<T>;
    /** Placeholder text for this scope */
    placeholder?: string;
    /** Minimum characters before search (overrides default) */
    minChars?: number;
    /** Whether this scope requires search (false = ID can be entered directly) */
    requiresSearch?: boolean;
}
/**
 * ScopeSearchBox configuration
 */
export interface ScopeSearchBoxConfig {
    /** The input element or selector for scope ID */
    input: HTMLInputElement | string;
    /** The select element or selector for scope type */
    scopeSelect: HTMLSelectElement | string;
    /** Container for the dropdown (defaults to parent of input) */
    container?: HTMLElement | string;
    /** Configurations for each scope type */
    scopeConfigs: ScopeConfig[];
    /** Default placeholder when no scope-specific placeholder */
    defaultPlaceholder?: string;
    /** Callback when a scope ID is selected */
    onSelect?: (scope: ScopeType, result: SearchResult) => void;
    /** Callback when scope type changes */
    onScopeChange?: (scope: ScopeType) => void;
    /** Callback when input is cleared */
    onClear?: () => void;
}
/**
 * System scope result - always returns empty (system has no ID)
 */
export interface SystemScopeResult {
    id: 'system';
    label: 'System';
}
/**
 * Tenant scope result
 */
export interface TenantScopeResult {
    id: string;
    name: string;
    slug?: string;
    status?: string;
}
/**
 * Organization scope result
 */
export interface OrgScopeResult {
    id: string;
    name: string;
    tenantId?: string;
    status?: string;
}
/**
 * User scope result
 */
export interface UserScopeResult {
    id: string;
    username: string;
    email?: string;
    displayName?: string;
    role?: string;
    avatar?: string;
}
//# sourceMappingURL=types.d.ts.map