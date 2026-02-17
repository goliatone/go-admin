/**
 * Capability Gate Utility (Phase 4 - TX-046)
 *
 * Provides capability-mode and permission gating for translation module
 * navigation and action controls. Follows the graceful degradation strategy:
 *
 * - Hidden: Module is off OR backend marks module as not visible
 * - Visible + Disabled: Module is visible but entry/action permission is denied
 * - Visible + Enabled: Module is on and user has all required permissions
 */
/**
 * Supported capability modes matching backend `translation_capabilities.profile`
 */
export type CapabilityMode = 'none' | 'core' | 'core+exchange' | 'core+queue' | 'full';
/**
 * Action state from backend permission evaluation
 */
export interface ActionState {
    enabled: boolean;
    reason?: string;
    reason_code?: string;
    permission?: string;
}
/**
 * Module state with entry permission and per-action permissions
 */
export interface ModuleState {
    enabled: boolean;
    visible: boolean;
    entry: ActionState;
    actions: Record<string, ActionState>;
}
/**
 * Route configuration from capabilities
 */
export interface RouteConfig {
    [key: string]: string;
}
/**
 * Translation capabilities payload from backend
 */
export interface TranslationCapabilities {
    profile: CapabilityMode;
    capability_mode: CapabilityMode;
    supported_profiles: CapabilityMode[];
    schema_version: number;
    modules: {
        exchange?: ModuleState;
        queue?: ModuleState;
    };
    features: {
        cms?: boolean;
        dashboard?: boolean;
    };
    routes: RouteConfig;
    panels: string[];
    resolver_keys: string[];
    warnings: string[];
    contracts?: Record<string, unknown>;
}
/**
 * Gate result for UI rendering
 */
export interface GateResult {
    /** Whether the element should be rendered */
    visible: boolean;
    /** Whether the element should be interactive */
    enabled: boolean;
    /** Reason for disabled state (if applicable) */
    reason?: string;
    /** Machine-readable reason code */
    reasonCode?: string;
    /** Permission that was evaluated */
    permission?: string;
}
/**
 * Nav item gate configuration
 */
export interface NavItemGate {
    /** Module key (exchange, queue) */
    module: 'exchange' | 'queue';
    /** Action key (optional - for action-level gating) */
    action?: string;
}
/**
 * Parse capability mode from string, with fallback to 'none'
 */
export declare function parseCapabilityMode(value: unknown): CapabilityMode;
/**
 * Check if exchange module is enabled by capability mode
 */
export declare function isExchangeEnabled(mode: CapabilityMode): boolean;
/**
 * Check if queue module is enabled by capability mode
 */
export declare function isQueueEnabled(mode: CapabilityMode): boolean;
/**
 * Check if core translation features are enabled
 */
export declare function isCoreEnabled(mode: CapabilityMode): boolean;
/**
 * Extract translation capabilities from a raw payload
 */
export declare function extractCapabilities(payload: unknown): TranslationCapabilities | null;
/**
 * Create a CapabilityGate instance for evaluating visibility and permissions
 */
export declare class CapabilityGate {
    private capabilities;
    constructor(capabilities: TranslationCapabilities);
    /**
     * Get the current capability mode
     */
    getMode(): CapabilityMode;
    /**
     * Get all capabilities
     */
    getCapabilities(): TranslationCapabilities;
    /**
     * Check if a module is enabled by capability mode
     */
    isModuleEnabledByMode(module: 'exchange' | 'queue'): boolean;
    /**
     * Get module state from capabilities
     */
    getModuleState(module: 'exchange' | 'queue'): ModuleState | null;
    /**
     * Get action state from a module
     */
    getActionState(module: 'exchange' | 'queue', action: string): ActionState | null;
    /**
     * Gate a navigation item.
     * Returns visibility/enabled state for rendering.
     *
     * Rule:
     * - backend visible=false => hidden
     * - backend visible=true + entry/action denied => visible-disabled
     */
    gateNavItem(gate: NavItemGate): GateResult;
    /**
     * Gate an action control.
     * Returns visibility/enabled state for rendering action buttons.
     */
    gateAction(module: 'exchange' | 'queue', action: string): GateResult;
    /**
     * Check if exchange module is accessible (visible and entry enabled)
     */
    canAccessExchange(): boolean;
    /**
     * Check if queue module is accessible (visible and entry enabled)
     */
    canAccessQueue(): boolean;
    /**
     * Get route URL for a given key
     */
    getRoute(key: string): string | null;
    /**
     * Check if a feature is enabled
     */
    isFeatureEnabled(feature: 'cms' | 'dashboard'): boolean;
}
/**
 * Create a CapabilityGate from raw payload
 */
export declare function createCapabilityGate(payload: unknown): CapabilityGate | null;
/**
 * Create a default (empty) CapabilityGate for fallback
 */
export declare function createEmptyCapabilityGate(): CapabilityGate;
/**
 * Render ARIA attributes for a gated element
 */
export declare function renderGateAriaAttributes(gate: GateResult): string;
/**
 * Render a disabled reason badge
 */
export declare function renderDisabledReasonBadge(gate: GateResult): string;
/**
 * Get CSS styles for capability gate components
 */
export declare function getCapabilityGateStyles(): string;
/**
 * Apply gate result to a DOM element
 */
export declare function applyGateToElement(element: HTMLElement, gate: GateResult): void;
/**
 * Initialize capability gating for all elements with data-capability-gate attribute
 */
export declare function initCapabilityGating(container: HTMLElement, gate: CapabilityGate): void;
//# sourceMappingURL=capability-gate.d.ts.map