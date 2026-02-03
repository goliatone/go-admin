/**
 * Activity View Switcher
 * Manages switching between table and timeline views with state persistence
 */
import type { ActivityViewMode, ViewSwitcherSelectors } from './types.js';
export declare class ActivityViewSwitcher {
    private selectors;
    private currentView;
    private onViewChange?;
    private container;
    private tableTab;
    private timelineTab;
    private tableView;
    private timelineView;
    private paginationContainer;
    constructor(selectors?: Partial<ViewSwitcherSelectors>, onViewChange?: (view: ActivityViewMode) => void);
    /**
     * Initialize the view switcher
     */
    init(): void;
    /**
     * Get the current view mode
     */
    getView(): ActivityViewMode;
    /**
     * Set the view mode programmatically
     */
    setView(view: ActivityViewMode, options?: {
        persist?: boolean;
        updateUrl?: boolean;
    }): void;
    /**
     * Destroy the view switcher and clean up event listeners
     */
    destroy(): void;
    private cacheElements;
    private handleTableClick;
    private handleTimelineClick;
    private bindEvents;
    /**
     * Restore view from URL param or localStorage
     */
    private restoreView;
    /**
     * Update UI elements to reflect current view
     */
    private updateUI;
    /**
     * Persist view preference to localStorage
     */
    private persistView;
    /**
     * Update URL parameter without page reload
     */
    private updateUrlParam;
    /**
     * Emit view change event
     */
    private emitViewChange;
    /**
     * Get view param for inclusion in API requests
     */
    static getViewFromUrl(): ActivityViewMode;
    /**
     * Add view param to existing URLSearchParams (for query sync)
     */
    static addViewToParams(params: URLSearchParams, view: ActivityViewMode): void;
}
//# sourceMappingURL=activity-view-switcher.d.ts.map