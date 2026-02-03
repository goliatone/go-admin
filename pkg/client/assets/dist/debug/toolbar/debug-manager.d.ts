export interface DebugManagerOptions {
    debugPath?: string;
    panels?: string[];
    slowThresholdMs?: number;
    container?: HTMLElement;
}
export declare class DebugManager {
    private fab;
    private toolbar;
    private options;
    private initialized;
    constructor(options?: DebugManagerOptions);
    /**
     * Initialize the debug UI with FAB and Toolbar
     */
    init(): void;
    /**
     * Destroy the debug UI
     */
    destroy(): void;
    /**
     * Expand the toolbar programmatically
     */
    expand(): void;
    /**
     * Collapse the toolbar programmatically
     */
    collapse(): void;
    /**
     * Toggle the toolbar state
     */
    toggle(): void;
    private createFab;
    private createToolbar;
    private wireEvents;
}
/**
 * Initialize debug UI from window config or data attributes
 */
export declare function initDebugManager(): DebugManager | null;
//# sourceMappingURL=debug-manager.d.ts.map