/**
 * Services Permission Gating Utilities
 * Permission checking, action guards, and UI gating for services module
 */
import { type ServicesPermission, ServicesAPIError } from './types.js';
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
/**
 * Services Permission Manager
 * Centralized permission state management and checking
 */
export declare class ServicesPermissionManager {
    private state;
    private loadPromise;
    private listeners;
    /**
     * Initialize the permission manager with granted permissions
     */
    init(permissions: ServicesPermission[]): void;
    /**
     * Load permissions from the server
     * Typically done by parsing user permissions from page context or API
     */
    load(fetcher: () => Promise<ServicesPermission[]>): Promise<void>;
    /**
     * Check if user has a specific permission
     */
    has(permission: ServicesPermission): boolean;
    /**
     * Check if user has all specified permissions
     */
    hasAll(permissions: ServicesPermission[]): boolean;
    /**
     * Check if user has any of the specified permissions
     */
    hasAny(permissions: ServicesPermission[]): boolean;
    /**
     * Check a single permission and return detailed result
     */
    check(permission: ServicesPermission): PermissionCheckResult;
    /**
     * Get missing permissions from a required set
     */
    getMissing(permissions: ServicesPermission[]): ServicesPermission[];
    /**
     * Check if permissions have been loaded
     */
    isLoaded(): boolean;
    /**
     * Get the current state
     */
    getState(): Readonly<PermissionState>;
    /**
     * Subscribe to state changes
     */
    subscribe(listener: (state: PermissionState) => void): () => void;
    /**
     * Reset the manager state
     */
    reset(): void;
    private notifyListeners;
}
/**
 * Get the default permission manager
 */
export declare function getPermissionManager(): ServicesPermissionManager;
/**
 * Initialize the default permission manager with permissions
 */
export declare function initPermissions(permissions: ServicesPermission[]): void;
/**
 * Create a permission guard for action buttons
 */
export declare function createPermissionGuard(permission: ServicesPermission, manager?: ServicesPermissionManager): PermissionGuard;
/**
 * Create a guard requiring all specified permissions
 */
export declare function requireAll(permissions: ServicesPermission[], manager?: ServicesPermissionManager): PermissionGuard;
/**
 * Create a guard requiring any of the specified permissions
 */
export declare function requireAny(permissions: ServicesPermission[], manager?: ServicesPermissionManager): PermissionGuard;
/**
 * Combine multiple guards with AND logic
 */
export declare function combineGuards(...guards: PermissionGuard[]): PermissionGuard;
/**
 * Guard: Can view services (providers, connections, etc.)
 */
export declare function canViewServices(manager?: ServicesPermissionManager): PermissionGuard;
/**
 * Guard: Can connect new services
 */
export declare function canConnect(manager?: ServicesPermissionManager): PermissionGuard;
/**
 * Guard: Can edit services (refresh, sync, etc.)
 */
export declare function canEdit(manager?: ServicesPermissionManager): PermissionGuard;
/**
 * Guard: Can revoke connections
 */
export declare function canRevoke(manager?: ServicesPermissionManager): PermissionGuard;
/**
 * Guard: Can re-consent connections
 */
export declare function canReconsent(manager?: ServicesPermissionManager): PermissionGuard;
/**
 * Guard: Can view activity
 */
export declare function canViewActivity(manager?: ServicesPermissionManager): PermissionGuard;
/**
 * Check if an error is a forbidden error
 */
export declare function isForbiddenError(error: unknown): error is ServicesAPIError;
/**
 * Handle forbidden error with callback
 */
export declare function handleForbidden(error: unknown, handler: (error: ServicesAPIError) => void): boolean;
/**
 * Wrap an async action with permission check
 */
export declare function withPermission<T>(permission: ServicesPermission, action: () => Promise<T>, onDenied?: () => void, manager?: ServicesPermissionManager): () => Promise<T | undefined>;
/**
 * Apply permission gating to an element
 */
export declare function gateElement(element: HTMLElement, options: PermissionGateOptions, manager?: ServicesPermissionManager): void;
/**
 * Initialize permission gating for all elements with data attributes
 * Usage: <div data-permission-requires="admin.services.edit">...</div>
 */
export declare function initPermissionGates(container?: HTMLElement, manager?: ServicesPermissionManager): void;
/**
 * Extract permissions from page context
 * Looks for window.__permissions or data-permissions attribute on body
 */
export declare function loadPermissionsFromContext(): ServicesPermission[];
/**
 * Initialize permissions from page context
 */
export declare function initPermissionsFromContext(): ServicesPermissionManager;
export { ServicesPermissions } from './types.js';
//# sourceMappingURL=permissions.d.ts.map