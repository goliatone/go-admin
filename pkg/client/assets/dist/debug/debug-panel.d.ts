import './shared/builtin-panels.js';
export declare class DebugPanel {
    private container;
    private debugPath;
    private panels;
    private activePanel;
    private state;
    private filters;
    private paused;
    private maxLogEntries;
    private maxSQLQueries;
    private slowThresholdMs;
    private eventCount;
    private lastEventAt;
    private stream;
    private streamBasePath;
    private sessions;
    private sessionsLoading;
    private sessionsLoaded;
    private sessionsError;
    private sessionsUpdatedAt;
    private activeSessionId;
    private activeSession;
    private replPanels;
    private replCommands;
    private panelRenderers;
    private tabsEl;
    private panelEl;
    private filtersEl;
    private statusEl;
    private connectionEl;
    private eventCountEl;
    private lastEventEl;
    private sessionBannerEl;
    private sessionMetaEl;
    private sessionDetachEl;
    private eventToPanel;
    private unsubscribeRegistry;
    private expandedRequests;
    constructor(container: HTMLElement);
    /**
     * Subscribe to WebSocket events for all panels based on registry
     */
    private subscribeToEvents;
    /**
     * Handle registry changes (panel registered/unregistered)
     */
    private handleRegistryChange;
    private requireElement;
    private bindActions;
    private renderTabs;
    private renderActivePanel;
    private renderFilters;
    private bindFilterInputs;
    private updateFiltersFromInputs;
    private renderPanel;
    private attachExpandableRowListeners;
    private attachCopyButtonListeners;
    private attachSQLSelectionListeners;
    private renderReplPanel;
    private getUniqueContentTypes;
    private renderRequests;
    private renderSQL;
    private renderLogs;
    private renderRoutes;
    private renderSessionsPanel;
    private renderCustom;
    private renderJSONPanel;
    private attachSessionActions;
    private fetchSessions;
    private attachSessionByID;
    private attachSession;
    private detachSession;
    private rebuildStream;
    private resetDebugState;
    private buildSessionStreamPath;
    private updateSessionBanner;
    private sessionMetaText;
    private panelCount;
    private renderEmptyState;
    private renderSelectOptions;
    private updateTabCounts;
    private updateConnectionStatus;
    private updateStatusMeta;
    private handleEvent;
    private handleCustomEvent;
    /**
     * Get state data for a snapshot key (used by registry-based event handling)
     */
    private getStateForKey;
    /**
     * Set state data for a snapshot key (used by registry-based event handling)
     */
    private setStateForKey;
    private applySnapshot;
    private trim;
    private isSlowQuery;
    private fetchSnapshot;
    private clearAll;
    private clearActivePanel;
    private togglePause;
}
export declare const initDebugPanel: (container?: HTMLElement | null) => DebugPanel | null;
//# sourceMappingURL=debug-panel.d.ts.map