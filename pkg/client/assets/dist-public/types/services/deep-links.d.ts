/**
 * Deep Links Module
 * Handles navigation to service entities with filter context preservation.
 *
 * Features:
 * - Generate links to connections, installations, subscriptions, sync jobs
 * - Preserve and restore filter context across navigation
 * - Support for back navigation with filter restoration
 */
/** Service entity types that can be linked to */
export type ServiceEntityType = 'connection' | 'installation' | 'subscription' | 'sync' | 'provider' | 'activity';
/** Configuration for deep link generation */
export interface DeepLinkConfig {
    /** Base path for services routes (default: '/admin/services') */
    basePath?: string;
    /** Custom path mapping for entity types */
    pathMap?: Partial<Record<ServiceEntityType, string>>;
}
/** Context to preserve during navigation */
export interface NavigationContext {
    /** Page user came from */
    fromPage?: string;
    /** Filters that were active */
    filters?: Record<string, string>;
    /** Search query that was active */
    search?: string;
    /** Current page number */
    page?: number;
    /** View mode (timeline/table for activity) */
    viewMode?: string;
}
/** Parsed deep link information */
export interface ParsedDeepLink {
    entityType: ServiceEntityType;
    entityId: string;
    context?: NavigationContext;
}
/**
 * Manages deep linking with context preservation.
 */
declare class DeepLinkManager {
    private basePath;
    private pathMap;
    private contextStorageKey;
    constructor(config?: DeepLinkConfig);
    /**
     * Configure the manager.
     */
    configure(config: DeepLinkConfig): void;
    /**
     * Generate a deep link URL for an entity.
     */
    generateLink(entityType: ServiceEntityType, entityId: string, context?: NavigationContext): string;
    /**
     * Generate a link to an entity list page with optional filters.
     */
    generateListLink(entityType: ServiceEntityType, filters?: Record<string, string>): string;
    /**
     * Navigate to an entity, preserving context for back navigation.
     */
    navigateTo(entityType: ServiceEntityType, entityId: string, context?: NavigationContext, options?: {
        replace?: boolean;
    }): void;
    /**
     * Navigate back with context restoration.
     */
    navigateBack(): NavigationContext | null;
    /**
     * Parse entity info from current URL.
     */
    parseCurrentUrl(): ParsedDeepLink | null;
    /**
     * Parse entity info from a URL.
     */
    parseUrl(url: string): ParsedDeepLink | null;
    /**
     * Map object_type values from activity entries to entity types.
     */
    mapObjectTypeToEntity(objectType: string): ServiceEntityType | null;
    /**
     * Create navigation context from current query state.
     */
    createContextFromQueryState(queryState: {
        filters: Record<string, string | undefined>;
        search?: string;
        page: number;
    }, viewMode?: string): NavigationContext;
    private saveContext;
    private restoreContext;
    private encodeContext;
    private decodeContext;
}
declare const manager: DeepLinkManager;
/**
 * Configure deep link manager.
 */
export declare function configureDeepLinks(config: DeepLinkConfig): void;
/**
 * Generate a deep link URL for an entity.
 */
export declare function generateDeepLink(entityType: ServiceEntityType, entityId: string, context?: NavigationContext): string;
/**
 * Generate a link to an entity list page.
 */
export declare function generateListLink(entityType: ServiceEntityType, filters?: Record<string, string>): string;
/**
 * Navigate to an entity with context preservation.
 */
export declare function navigateToEntity(entityType: ServiceEntityType, entityId: string, context?: NavigationContext, options?: {
    replace?: boolean;
}): void;
/**
 * Navigate back with context restoration.
 */
export declare function navigateBack(): NavigationContext | null;
/**
 * Parse entity info from current URL.
 */
export declare function parseCurrentDeepLink(): ParsedDeepLink | null;
/**
 * Parse entity info from a URL.
 */
export declare function parseDeepLink(url: string): ParsedDeepLink | null;
/**
 * Map object_type to entity type.
 */
export declare function mapObjectTypeToEntity(objectType: string): ServiceEntityType | null;
/**
 * Create navigation context from current query state.
 */
export declare function createNavigationContext(queryState: {
    filters: Record<string, string | undefined>;
    search?: string;
    page: number;
}, viewMode?: string): NavigationContext;
/**
 * Create an onNavigate handler for the activity page that uses deep links.
 * This wraps navigation with context preservation.
 */
export declare function createActivityNavigateHandler(getQueryState: () => {
    filters: Record<string, string | undefined>;
    search?: string;
    page: number;
}, getViewMode?: () => string): (objectType: string, objectId: string) => void;
export { DeepLinkManager, manager as deepLinkManager, };
//# sourceMappingURL=deep-links.d.ts.map