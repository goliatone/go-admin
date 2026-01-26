/**
 * Activity Manager
 * Manages activity feed display with enhanced formatting and view switching
 */
import type { ActivityConfig, ActivitySelectors, ToastNotifier } from './types.js';
export declare class ActivityManager {
    private config;
    private selectors;
    private toast;
    private form;
    private tableBody;
    private emptyState;
    private disabledState;
    private errorState;
    private countEl;
    private prevBtn;
    private nextBtn;
    private refreshBtn;
    private clearBtn;
    private limitInput;
    private viewSwitcher;
    private timelineRenderer;
    private timelineContainer;
    private timelineSentinel;
    private infiniteScrollObserver;
    private isLoadingMore;
    private allEntriesLoaded;
    private cachedEntries;
    private state;
    constructor(config: ActivityConfig, selectors?: Partial<ActivitySelectors>, toast?: ToastNotifier);
    /**
     * Initialize the activity manager
     */
    init(): void;
    /**
     * Initialize the view switcher
     */
    private initViewSwitcher;
    /**
     * Initialize the timeline renderer
     */
    private initTimeline;
    /**
     * Handle view change from switcher
     */
    private handleViewChange;
    /**
     * Set up infinite scroll for timeline view
     */
    private setupInfiniteScroll;
    /**
     * Enable infinite scroll observation
     */
    private enableInfiniteScroll;
    /**
     * Disable infinite scroll observation
     */
    private disableInfiniteScroll;
    /**
     * Load more entries for infinite scroll
     */
    private loadMoreEntries;
    private cacheElements;
    private bindEvents;
    private getInputValue;
    private setInputValue;
    private toLocalInput;
    private toRFC3339;
    private syncFromQuery;
    private buildParams;
    private syncUrl;
    private resetStates;
    private showError;
    private showDisabled;
    loadActivity(): Promise<void>;
    /**
     * Render entries in timeline view
     */
    private renderTimeline;
    private renderRows;
    private createRowPair;
    private createSessionRow;
    private wireMetadataToggles;
    private updatePagination;
}
//# sourceMappingURL=activity-manager.d.ts.map