/**
 * Activity Manager
 * Manages activity feed display with enhanced formatting
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
    private state;
    constructor(config: ActivityConfig, selectors?: Partial<ActivitySelectors>, toast?: ToastNotifier);
    /**
     * Initialize the activity manager
     */
    init(): void;
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
    private renderRows;
    private createRow;
    private wireMetadataToggles;
    private updatePagination;
}
//# sourceMappingURL=activity-manager.d.ts.map