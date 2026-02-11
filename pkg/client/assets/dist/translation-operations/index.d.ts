/**
 * Translation Operations Entrypoint Module
 *
 * Provides shared UI behavior for translation operations (queue/exchange)
 * based on backend capability metadata gating.
 *
 * Task 19.5: Uses resolver-based links from backend capabilities,
 * not ad-hoc template-only flags.
 */
/**
 * Translation capability profile from backend
 */
export type TranslationProfile = 'none' | 'core' | 'core+exchange' | 'core+queue' | 'full';
/**
 * Module enablement state
 */
export interface TranslationModuleState {
    enabled: boolean;
}
/**
 * Translation capabilities from backend
 */
export interface TranslationCapabilities {
    /** Active capability profile */
    profile: TranslationProfile;
    /** Schema version for compatibility */
    schema_version: number;
    /** Module enablement states */
    modules: {
        exchange: TranslationModuleState;
        queue: TranslationModuleState;
    };
    /** Feature enablement states */
    features: {
        cms: boolean;
        dashboard: boolean;
    };
    /** Resolver-based routes */
    routes: Record<string, string>;
    /** Registered panels */
    panels: string[];
    /** Available resolver keys */
    resolver_keys: string[];
    /** Configuration warnings */
    warnings: string[];
}
/**
 * Entrypoint link definition
 */
export interface TranslationEntrypoint {
    /** Unique identifier */
    id: string;
    /** Display label */
    label: string;
    /** Icon class (iconoir) */
    icon: string;
    /** Target URL (resolver-based) */
    href: string;
    /** Module that enables this entrypoint */
    module: 'exchange' | 'queue' | 'core';
    /** Whether this entrypoint is enabled */
    enabled: boolean;
    /** Optional description */
    description?: string;
    /** Badge text (e.g., "New") */
    badge?: string;
    /** Badge variant */
    badgeVariant?: 'info' | 'warning' | 'success' | 'danger';
}
/**
 * Configuration for TranslationOperationsManager
 */
export interface TranslationOperationsConfig {
    /** Base path for the admin UI */
    basePath: string;
    /** Translation capabilities from backend */
    capabilities?: TranslationCapabilities;
    /** Container element or selector for rendering entrypoints */
    container?: HTMLElement | string;
    /** Callback when an entrypoint is clicked */
    onEntrypointClick?: (entrypoint: TranslationEntrypoint) => void;
}
/**
 * Resolver route keys for translation operations
 */
declare const ROUTE_KEYS: {
    readonly QUEUE: "admin.translations.queue";
    readonly EXCHANGE_UI: "admin.translations.exchange";
    readonly EXCHANGE_EXPORT: "admin.api.translations.export";
    readonly EXCHANGE_IMPORT_VALIDATE: "admin.api.translations.import.validate";
    readonly EXCHANGE_IMPORT_APPLY: "admin.api.translations.import.apply";
};
/**
 * Extracts translation capabilities from page context
 * Looks for data embedded in a script tag or window object
 */
export declare function extractTranslationCapabilities(): TranslationCapabilities;
/**
 * Checks if translation exchange module is enabled
 */
export declare function isExchangeEnabled(caps?: TranslationCapabilities): boolean;
/**
 * Checks if translation queue module is enabled
 */
export declare function isQueueEnabled(caps?: TranslationCapabilities): boolean;
/**
 * Checks if any translation operations module is enabled
 */
export declare function hasTranslationOperations(caps?: TranslationCapabilities): boolean;
/**
 * Gets the resolved route for a translation operation
 */
export declare function getTranslationRoute(key: keyof typeof ROUTE_KEYS, caps?: TranslationCapabilities, basePath?: string): string | null;
/**
 * Builds the list of available translation operation entrypoints
 * based on backend capability metadata
 */
export declare function buildTranslationEntrypoints(caps?: TranslationCapabilities, basePath?: string): TranslationEntrypoint[];
/**
 * Renders a single entrypoint as an HTML element
 */
export declare function renderEntrypointLink(entrypoint: TranslationEntrypoint, options?: {
    asListItem?: boolean;
    className?: string;
}): HTMLElement;
/**
 * Renders all enabled translation operation entrypoints
 */
export declare function renderTranslationEntrypoints(container: HTMLElement | string, caps?: TranslationCapabilities, basePath?: string, options?: {
    asListItems?: boolean;
    headerLabel?: string;
}): void;
/**
 * Manager class for translation operations UI
 */
export declare class TranslationOperationsManager {
    private config;
    private capabilities;
    private entrypoints;
    constructor(config: TranslationOperationsConfig);
    /** Get capabilities */
    getCapabilities(): TranslationCapabilities;
    /** Get available entrypoints */
    getEntrypoints(): TranslationEntrypoint[];
    /** Check if any operations are available */
    hasOperations(): boolean;
    /** Check if exchange is enabled */
    isExchangeEnabled(): boolean;
    /** Check if queue is enabled */
    isQueueEnabled(): boolean;
    /** Get route for a specific operation */
    getRoute(key: keyof typeof ROUTE_KEYS): string | null;
    /** Initialize and render entrypoints */
    init(): void;
}
/**
 * Auto-initializes translation operations if container exists
 */
export declare function initTranslationOperations(basePath?: string): TranslationOperationsManager | null;
export {};
//# sourceMappingURL=index.d.ts.map