/**
 * TabsController - Manages tab navigation and content loading for resource detail views
 */
import type { TabLink, TabPanelContainer, TabControllerOptions } from './types';
export declare class TabsController {
    private tabsNav;
    private panelContainer;
    private tabLinks;
    private basePath;
    private apiBasePath;
    private panelName;
    private recordId;
    private options;
    constructor(tabsNav: HTMLElement, panelContainer: TabPanelContainer, options?: TabControllerOptions);
    private init;
    private buildEndpoint;
    private setActiveTab;
    private updateUrl;
    private handleTabClick;
    loadTab(link: TabLink, options?: {
        silent?: boolean;
    }): Promise<boolean>;
    /**
     * Get the currently active tab ID
     */
    getActiveTabId(): string;
    /**
     * Programmatically switch to a tab by ID
     */
    switchToTab(tabId: string): void;
}
/**
 * Initialize tabs controller for a page
 * Returns the controller instance or null if required elements are not found
 */
export declare function initTabsController(options?: TabControllerOptions): TabsController | null;
//# sourceMappingURL=tabs-controller.d.ts.map