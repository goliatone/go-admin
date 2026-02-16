/**
 * Deep Links Module
 * Handles navigation to service entities with filter context preservation.
 *
 * Features:
 * - Generate links to connections, installations, subscriptions, sync jobs
 * - Preserve and restore filter context across navigation
 * - Support for back navigation with filter restoration
 */

// =============================================================================
// Types
// =============================================================================

/** Service entity types that can be linked to */
export type ServiceEntityType =
  | 'connection'
  | 'installation'
  | 'subscription'
  | 'sync'
  | 'provider'
  | 'activity';

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

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_BASE_PATH = '/admin/services';

const DEFAULT_PATH_MAP: Record<ServiceEntityType, string> = {
  connection: 'connections',
  installation: 'installations',
  subscription: 'subscriptions',
  sync: 'sync',
  provider: 'providers',
  activity: 'activity',
};

// =============================================================================
// Deep Link Manager
// =============================================================================

/**
 * Manages deep linking with context preservation.
 */
class DeepLinkManager {
  private basePath: string;
  private pathMap: Record<ServiceEntityType, string>;
  private contextStorageKey = 'services-nav-context';

  constructor(config: DeepLinkConfig = {}) {
    this.basePath = config.basePath || DEFAULT_BASE_PATH;
    this.pathMap = { ...DEFAULT_PATH_MAP, ...config.pathMap };
  }

  /**
   * Configure the manager.
   */
  configure(config: DeepLinkConfig): void {
    if (config.basePath) {
      this.basePath = config.basePath;
    }
    if (config.pathMap) {
      this.pathMap = { ...this.pathMap, ...config.pathMap };
    }
  }

  /**
   * Generate a deep link URL for an entity.
   */
  generateLink(
    entityType: ServiceEntityType,
    entityId: string,
    context?: NavigationContext
  ): string {
    const path = this.pathMap[entityType] || entityType;
    let url = `${this.basePath}/${path}/${encodeURIComponent(entityId)}`;

    // Encode context in URL if provided
    if (context) {
      const contextParam = this.encodeContext(context);
      if (contextParam) {
        url += `?ctx=${contextParam}`;
      }
    }

    return url;
  }

  /**
   * Generate a link to an entity list page with optional filters.
   */
  generateListLink(
    entityType: ServiceEntityType,
    filters?: Record<string, string>
  ): string {
    const path = this.pathMap[entityType] || entityType;
    let url = `${this.basePath}/${path}`;

    if (filters && Object.keys(filters).length > 0) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value) {
          params.set(key, value);
        }
      }
      url += `?${params.toString()}`;
    }

    return url;
  }

  /**
   * Navigate to an entity, preserving context for back navigation.
   */
  navigateTo(
    entityType: ServiceEntityType,
    entityId: string,
    context?: NavigationContext,
    options: { replace?: boolean } = {}
  ): void {
    // Save context for back navigation
    if (context) {
      this.saveContext(context);
    }

    const url = this.generateLink(entityType, entityId, context);

    if (options.replace) {
      window.history.replaceState({ entityType, entityId, context }, '', url);
    } else {
      window.history.pushState({ entityType, entityId, context }, '', url);
    }

    // Dispatch navigation event for app-level routing
    window.dispatchEvent(
      new CustomEvent('services:navigate', {
        detail: { entityType, entityId, context, url },
      })
    );
  }

  /**
   * Navigate back with context restoration.
   */
  navigateBack(): NavigationContext | null {
    const context = this.restoreContext();

    if (context?.fromPage) {
      // Build return URL with filters
      const params = new URLSearchParams();

      if (context.filters) {
        for (const [key, value] of Object.entries(context.filters)) {
          if (value) params.set(key, value);
        }
      }
      if (context.search) {
        params.set('q', context.search);
      }
      if (context.page && context.page > 1) {
        params.set('page', String(context.page));
      }
      if (context.viewMode) {
        params.set('view', context.viewMode);
      }

      const queryString = params.toString();
      const url = queryString ? `${context.fromPage}?${queryString}` : context.fromPage;

      window.history.pushState({ restored: true }, '', url);

      // Dispatch back navigation event
      window.dispatchEvent(
        new CustomEvent('services:navigate-back', {
          detail: { context, url },
        })
      );

      return context;
    }

    // Fallback to browser back
    window.history.back();
    return null;
  }

  /**
   * Parse entity info from current URL.
   */
  parseCurrentUrl(): ParsedDeepLink | null {
    return this.parseUrl(window.location.pathname + window.location.search);
  }

  /**
   * Parse entity info from a URL.
   */
  parseUrl(url: string): ParsedDeepLink | null {
    const [pathname, search] = url.split('?');

    // Extract path after base
    const relativePath = pathname.startsWith(this.basePath)
      ? pathname.slice(this.basePath.length)
      : pathname;

    const segments = relativePath.split('/').filter(Boolean);
    if (segments.length < 2) {
      return null;
    }

    // Find entity type from path
    const entityPath = segments[0];
    const entityId = decodeURIComponent(segments[1]);

    let entityType: ServiceEntityType | null = null;
    for (const [type, path] of Object.entries(this.pathMap)) {
      if (path === entityPath) {
        entityType = type as ServiceEntityType;
        break;
      }
    }

    if (!entityType) {
      return null;
    }

    // Parse context from query string
    let context: NavigationContext | undefined;
    if (search) {
      const params = new URLSearchParams(search);
      const ctxParam = params.get('ctx');
      if (ctxParam) {
        context = this.decodeContext(ctxParam);
      }
    }

    return { entityType, entityId, context };
  }

  /**
   * Map object_type values from activity entries to entity types.
   */
  mapObjectTypeToEntity(objectType: string): ServiceEntityType | null {
    const mapping: Record<string, ServiceEntityType> = {
      connection: 'connection',
      connections: 'connection',
      installation: 'installation',
      installations: 'installation',
      subscription: 'subscription',
      subscriptions: 'subscription',
      sync: 'sync',
      sync_job: 'sync',
      sync_jobs: 'sync',
      provider: 'provider',
      providers: 'provider',
    };

    return mapping[objectType.toLowerCase()] || null;
  }

  /**
   * Create navigation context from current query state.
   */
  createContextFromQueryState(
    queryState: {
      filters: Record<string, string | undefined>;
      search?: string;
      page: number;
    },
    viewMode?: string
  ): NavigationContext {
    const filters: Record<string, string> = {};
    for (const [key, value] of Object.entries(queryState.filters)) {
      if (value) {
        filters[key] = value;
      }
    }

    return {
      fromPage: window.location.pathname,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      search: queryState.search || undefined,
      page: queryState.page > 1 ? queryState.page : undefined,
      viewMode,
    };
  }

  // ---------------------------------------------------------------------------
  // Context Storage
  // ---------------------------------------------------------------------------

  private saveContext(context: NavigationContext): void {
    try {
      sessionStorage.setItem(this.contextStorageKey, JSON.stringify(context));
    } catch (e) {
      // Ignore storage errors
    }
  }

  private restoreContext(): NavigationContext | null {
    try {
      const stored = sessionStorage.getItem(this.contextStorageKey);
      if (stored) {
        sessionStorage.removeItem(this.contextStorageKey);
        return JSON.parse(stored);
      }
    } catch (e) {
      // Ignore storage errors
    }
    return null;
  }

  private encodeContext(context: NavigationContext): string {
    try {
      return btoa(JSON.stringify(context));
    } catch (e) {
      return '';
    }
  }

  private decodeContext(encoded: string): NavigationContext | undefined {
    try {
      return JSON.parse(atob(encoded));
    } catch (e) {
      return undefined;
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

const manager = new DeepLinkManager();

/**
 * Configure deep link manager.
 */
export function configureDeepLinks(config: DeepLinkConfig): void {
  manager.configure(config);
}

/**
 * Generate a deep link URL for an entity.
 */
export function generateDeepLink(
  entityType: ServiceEntityType,
  entityId: string,
  context?: NavigationContext
): string {
  return manager.generateLink(entityType, entityId, context);
}

/**
 * Generate a link to an entity list page.
 */
export function generateListLink(
  entityType: ServiceEntityType,
  filters?: Record<string, string>
): string {
  return manager.generateListLink(entityType, filters);
}

/**
 * Navigate to an entity with context preservation.
 */
export function navigateToEntity(
  entityType: ServiceEntityType,
  entityId: string,
  context?: NavigationContext,
  options?: { replace?: boolean }
): void {
  manager.navigateTo(entityType, entityId, context, options);
}

/**
 * Navigate back with context restoration.
 */
export function navigateBack(): NavigationContext | null {
  return manager.navigateBack();
}

/**
 * Parse entity info from current URL.
 */
export function parseCurrentDeepLink(): ParsedDeepLink | null {
  return manager.parseCurrentUrl();
}

/**
 * Parse entity info from a URL.
 */
export function parseDeepLink(url: string): ParsedDeepLink | null {
  return manager.parseUrl(url);
}

/**
 * Map object_type to entity type.
 */
export function mapObjectTypeToEntity(objectType: string): ServiceEntityType | null {
  return manager.mapObjectTypeToEntity(objectType);
}

/**
 * Create navigation context from current query state.
 */
export function createNavigationContext(
  queryState: {
    filters: Record<string, string | undefined>;
    search?: string;
    page: number;
  },
  viewMode?: string
): NavigationContext {
  return manager.createContextFromQueryState(queryState, viewMode);
}

// =============================================================================
// Integration Helper for Activity Page
// =============================================================================

/**
 * Create an onNavigate handler for the activity page that uses deep links.
 * This wraps navigation with context preservation.
 */
export function createActivityNavigateHandler(
  getQueryState: () => {
    filters: Record<string, string | undefined>;
    search?: string;
    page: number;
  },
  getViewMode?: () => string
): (objectType: string, objectId: string) => void {
  return (objectType: string, objectId: string) => {
    const entityType = mapObjectTypeToEntity(objectType);
    if (!entityType) {
      console.warn(`[DeepLinks] Unknown object type: ${objectType}`);
      return;
    }

    const context = createNavigationContext(
      getQueryState(),
      getViewMode?.()
    );

    navigateToEntity(entityType, objectId, context);
  };
}

// =============================================================================
// Exports
// =============================================================================

export {
  DeepLinkManager,
  manager as deepLinkManager,
};
