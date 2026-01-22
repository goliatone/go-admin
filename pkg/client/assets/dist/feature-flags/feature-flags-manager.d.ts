/**
 * Feature Flags Manager
 * Manages feature flag display, filtering, and updates
 */
import type { FeatureFlagsConfig, FeatureFlagsSelectors, OverrideState, ToastNotifier } from './types.js';
export declare class FeatureFlagsManager {
    private config;
    private selectors;
    private toast;
    private scopeSelect;
    private scopeIdInput;
    private applyScopeBtn;
    private refreshBtn;
    private searchInput;
    private mutableStateEl;
    private tableBody;
    private emptyState;
    private allFlags;
    private isMutable;
    private documentClickHandler;
    constructor(config: FeatureFlagsConfig, selectors?: Partial<FeatureFlagsSelectors>, toast?: ToastNotifier);
    /**
     * Initialize the feature flags manager
     */
    init(): void;
    /**
     * Destroy the manager and clean up event listeners
     */
    destroy(): void;
    private cacheElements;
    private bindEvents;
    private syncFromQuery;
    private syncUrl;
    private buildScopeParams;
    loadFlags(): Promise<void>;
    updateFlag(key: string, state: OverrideState): Promise<void>;
    private renderFlags;
    private createFlagRow;
    private badge;
    private normalizeOverrideState;
    private currentOverrideValue;
    private renderActionMenu;
    private wireActionMenus;
    private escapeHtml;
}
//# sourceMappingURL=feature-flags-manager.d.ts.map