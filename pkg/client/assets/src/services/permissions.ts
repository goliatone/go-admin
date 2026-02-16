/**
 * Services Permission Gating Utilities
 * Permission checking, action guards, and UI gating for services module
 */

import { ServicesPermissions, type ServicesPermission, ServicesAPIError } from './types.js';

// =============================================================================
// Types
// =============================================================================

export interface PermissionState {
  /** Permissions the current user has */
  granted: Set<ServicesPermission>;
  /** Whether permissions have been loaded */
  loaded: boolean;
  /** Last error loading permissions */
  error?: Error;
}

export interface PermissionCheckResult {
  /** Whether permission is granted */
  allowed: boolean;
  /** The permission that was checked */
  permission: ServicesPermission;
  /** Reason for denial (if not allowed) */
  reason?: string;
}

export interface PermissionGateOptions {
  /** Permissions required (all must be granted) */
  requires?: ServicesPermission[];
  /** Permissions where any one grants access */
  requiresAny?: ServicesPermission[];
  /** Callback when access is denied */
  onDenied?: (missing: ServicesPermission[]) => void;
  /** Element to show when denied (instead of hiding) */
  deniedContent?: string | HTMLElement;
  /** Whether to disable instead of hide when denied */
  disableOnDenied?: boolean;
}

export type PermissionGuard = (record?: unknown) => boolean;

// =============================================================================
// Permission Manager
// =============================================================================

/**
 * Services Permission Manager
 * Centralized permission state management and checking
 */
export class ServicesPermissionManager {
  private state: PermissionState = {
    granted: new Set(),
    loaded: false,
  };
  private loadPromise: Promise<void> | null = null;
  private listeners: Set<(state: PermissionState) => void> = new Set();

  /**
   * Initialize the permission manager with granted permissions
   */
  init(permissions: ServicesPermission[]): void {
    this.state = {
      granted: new Set(permissions),
      loaded: true,
    };
    this.notifyListeners();
  }

  /**
   * Load permissions from the server
   * Typically done by parsing user permissions from page context or API
   */
  async load(fetcher: () => Promise<ServicesPermission[]>): Promise<void> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = (async () => {
      try {
        const permissions = await fetcher();
        this.state = {
          granted: new Set(permissions),
          loaded: true,
        };
      } catch (error) {
        this.state = {
          ...this.state,
          loaded: true,
          error: error instanceof Error ? error : new Error(String(error)),
        };
      } finally {
        this.loadPromise = null;
        this.notifyListeners();
      }
    })();

    return this.loadPromise;
  }

  /**
   * Check if user has a specific permission
   */
  has(permission: ServicesPermission): boolean {
    return this.state.granted.has(permission);
  }

  /**
   * Check if user has all specified permissions
   */
  hasAll(permissions: ServicesPermission[]): boolean {
    return permissions.every((p) => this.state.granted.has(p));
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAny(permissions: ServicesPermission[]): boolean {
    return permissions.some((p) => this.state.granted.has(p));
  }

  /**
   * Check a single permission and return detailed result
   */
  check(permission: ServicesPermission): PermissionCheckResult {
    const allowed = this.state.granted.has(permission);
    return {
      allowed,
      permission,
      reason: allowed ? undefined : `Missing permission: ${permission}`,
    };
  }

  /**
   * Get missing permissions from a required set
   */
  getMissing(permissions: ServicesPermission[]): ServicesPermission[] {
    return permissions.filter((p) => !this.state.granted.has(p));
  }

  /**
   * Check if permissions have been loaded
   */
  isLoaded(): boolean {
    return this.state.loaded;
  }

  /**
   * Get the current state
   */
  getState(): Readonly<PermissionState> {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: PermissionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Reset the manager state
   */
  reset(): void {
    this.state = {
      granted: new Set(),
      loaded: false,
    };
    this.loadPromise = null;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let defaultManager: ServicesPermissionManager | null = null;

/**
 * Get the default permission manager
 */
export function getPermissionManager(): ServicesPermissionManager {
  if (!defaultManager) {
    defaultManager = new ServicesPermissionManager();
  }
  return defaultManager;
}

/**
 * Initialize the default permission manager with permissions
 */
export function initPermissions(permissions: ServicesPermission[]): void {
  getPermissionManager().init(permissions);
}

// =============================================================================
// Permission Guards
// =============================================================================

/**
 * Create a permission guard for action buttons
 */
export function createPermissionGuard(
  permission: ServicesPermission,
  manager?: ServicesPermissionManager
): PermissionGuard {
  const mgr = manager || getPermissionManager();
  return () => mgr.has(permission);
}

/**
 * Create a guard requiring all specified permissions
 */
export function requireAll(
  permissions: ServicesPermission[],
  manager?: ServicesPermissionManager
): PermissionGuard {
  const mgr = manager || getPermissionManager();
  return () => mgr.hasAll(permissions);
}

/**
 * Create a guard requiring any of the specified permissions
 */
export function requireAny(
  permissions: ServicesPermission[],
  manager?: ServicesPermissionManager
): PermissionGuard {
  const mgr = manager || getPermissionManager();
  return () => mgr.hasAny(permissions);
}

/**
 * Combine multiple guards with AND logic
 */
export function combineGuards(...guards: PermissionGuard[]): PermissionGuard {
  return (record?: unknown) => guards.every((guard) => guard(record));
}

// =============================================================================
// Pre-built Guards for Services
// =============================================================================

/**
 * Guard: Can view services (providers, connections, etc.)
 */
export function canViewServices(manager?: ServicesPermissionManager): PermissionGuard {
  return createPermissionGuard(ServicesPermissions.VIEW, manager);
}

/**
 * Guard: Can connect new services
 */
export function canConnect(manager?: ServicesPermissionManager): PermissionGuard {
  return createPermissionGuard(ServicesPermissions.CONNECT, manager);
}

/**
 * Guard: Can edit services (refresh, sync, etc.)
 */
export function canEdit(manager?: ServicesPermissionManager): PermissionGuard {
  return createPermissionGuard(ServicesPermissions.EDIT, manager);
}

/**
 * Guard: Can revoke connections
 */
export function canRevoke(manager?: ServicesPermissionManager): PermissionGuard {
  return createPermissionGuard(ServicesPermissions.REVOKE, manager);
}

/**
 * Guard: Can re-consent connections
 */
export function canReconsent(manager?: ServicesPermissionManager): PermissionGuard {
  return createPermissionGuard(ServicesPermissions.RECONSENT, manager);
}

/**
 * Guard: Can view activity
 */
export function canViewActivity(manager?: ServicesPermissionManager): PermissionGuard {
  return createPermissionGuard(ServicesPermissions.ACTIVITY_VIEW, manager);
}

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Check if an error is a forbidden error
 */
export function isForbiddenError(error: unknown): error is ServicesAPIError {
  return error instanceof ServicesAPIError && error.isForbidden;
}

/**
 * Handle forbidden error with callback
 */
export function handleForbidden(
  error: unknown,
  handler: (error: ServicesAPIError) => void
): boolean {
  if (isForbiddenError(error)) {
    handler(error);
    return true;
  }
  return false;
}

/**
 * Wrap an async action with permission check
 */
export function withPermission<T>(
  permission: ServicesPermission,
  action: () => Promise<T>,
  onDenied?: () => void,
  manager?: ServicesPermissionManager
): () => Promise<T | undefined> {
  const mgr = manager || getPermissionManager();
  return async () => {
    if (!mgr.has(permission)) {
      onDenied?.();
      return undefined;
    }
    return action();
  };
}

// =============================================================================
// DOM Utilities
// =============================================================================

/**
 * Apply permission gating to an element
 */
export function gateElement(
  element: HTMLElement,
  options: PermissionGateOptions,
  manager?: ServicesPermissionManager
): void {
  const mgr = manager || getPermissionManager();
  const { requires = [], requiresAny = [], onDenied, disableOnDenied } = options;

  // Check permissions
  let allowed = true;
  let missing: ServicesPermission[] = [];

  if (requires.length > 0) {
    missing = mgr.getMissing(requires);
    allowed = missing.length === 0;
  } else if (requiresAny.length > 0) {
    allowed = mgr.hasAny(requiresAny);
    if (!allowed) {
      missing = requiresAny;
    }
  }

  if (!allowed) {
    if (disableOnDenied) {
      // Disable the element
      if (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) {
        element.disabled = true;
      }
      element.classList.add('permission-denied', 'opacity-50', 'cursor-not-allowed');
      element.setAttribute('title', `Permission required: ${missing.join(', ')}`);
    } else {
      // Hide the element
      element.style.display = 'none';
      element.classList.add('permission-hidden');
    }

    // Replace with denied content if provided
    if (options.deniedContent) {
      if (typeof options.deniedContent === 'string') {
        element.outerHTML = options.deniedContent;
      } else {
        element.replaceWith(options.deniedContent);
      }
    }

    onDenied?.(missing);
  }
}

/**
 * Initialize permission gating for all elements with data attributes
 * Usage: <div data-permission-requires="admin.services.edit">...</div>
 */
export function initPermissionGates(
  container: HTMLElement = document.body,
  manager?: ServicesPermissionManager
): void {
  // Elements requiring all permissions
  const requiresElements = container.querySelectorAll<HTMLElement>('[data-permission-requires]');
  requiresElements.forEach((element) => {
    const permissions = element.dataset.permissionRequires
      ?.split(',')
      .map((p) => p.trim()) as ServicesPermission[];

    if (permissions && permissions.length > 0) {
      gateElement(element, { requires: permissions }, manager);
    }
  });

  // Elements requiring any permission
  const requiresAnyElements = container.querySelectorAll<HTMLElement>('[data-permission-requires-any]');
  requiresAnyElements.forEach((element) => {
    const permissions = element.dataset.permissionRequiresAny
      ?.split(',')
      .map((p) => p.trim()) as ServicesPermission[];

    if (permissions && permissions.length > 0) {
      gateElement(element, { requiresAny: permissions }, manager);
    }
  });

  // Elements to disable instead of hide
  const disableElements = container.querySelectorAll<HTMLElement>('[data-permission-disable]');
  disableElements.forEach((element) => {
    const permissions = element.dataset.permissionDisable
      ?.split(',')
      .map((p) => p.trim()) as ServicesPermission[];

    if (permissions && permissions.length > 0) {
      gateElement(element, { requires: permissions, disableOnDenied: true }, manager);
    }
  });
}

// =============================================================================
// Permission Loading Helpers
// =============================================================================

/**
 * Extract permissions from page context
 * Looks for window.__permissions or data-permissions attribute on body
 */
export function loadPermissionsFromContext(): ServicesPermission[] {
  // Try window global
  const windowPerms = (window as unknown as { __permissions?: string[] }).__permissions;
  if (Array.isArray(windowPerms)) {
    return windowPerms.filter((p) =>
      Object.values(ServicesPermissions).includes(p as ServicesPermission)
    ) as ServicesPermission[];
  }

  // Try body data attribute
  const bodyPerms = document.body.dataset.permissions;
  if (bodyPerms) {
    try {
      const parsed = JSON.parse(bodyPerms);
      if (Array.isArray(parsed)) {
        return parsed.filter((p) =>
          Object.values(ServicesPermissions).includes(p as ServicesPermission)
        ) as ServicesPermission[];
      }
    } catch {
      // Ignore parse errors
    }
  }

  return [];
}

/**
 * Initialize permissions from page context
 */
export function initPermissionsFromContext(): ServicesPermissionManager {
  const permissions = loadPermissionsFromContext();
  const manager = getPermissionManager();
  manager.init(permissions);
  return manager;
}

// =============================================================================
// Re-exports
// =============================================================================

export { ServicesPermissions } from './types.js';
