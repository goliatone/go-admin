import { DebugStream, type DebugStreamStatus } from '../debug-stream.js';
import { type DebugSnapshot } from './panel-renderers.js';
import '../shared/builtin-panels.js';
export declare class DebugToolbar extends HTMLElement {
    private shadow;
    private stream;
    private externalStream;
    private snapshot;
    private replPanels;
    private replCommands;
    private expanded;
    private activePanel;
    private connectionStatus;
    private slowThresholdMs;
    private useFab;
    private customHeight;
    private isResizing;
    private resizeStartY;
    private resizeStartHeight;
    private panelSortOrder;
    private eventToPanel;
    private unsubscribeRegistry;
    private static readonly MIN_HEIGHT;
    private static readonly MAX_HEIGHT_RATIO;
    private static readonly DEFAULT_HEIGHT;
    static get observedAttributes(): string[];
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    /**
     * Handle registry changes (panel registered/unregistered)
     */
    private handleRegistryChange;
    /**
     * Update WebSocket subscriptions based on current panels
     */
    private updateSubscriptions;
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
    setExpanded(expanded: boolean): void;
    setSnapshot(snapshot: DebugSnapshot): void;
    setConnectionStatus(status: DebugStreamStatus): void;
    setStream(stream: DebugStream): void;
    isExpanded(): boolean;
    private loadState;
    private saveState;
    private handleKeyDown;
    private setupKeyboardShortcut;
    private toggleExpanded;
    private collapse;
    private dispatchExpandEvent;
    private get basePath();
    private get debugPath();
    private get panels();
    private get wsUrl();
    private getStream;
    private initWebSocket;
    private fetchInitialSnapshot;
    private handleEvent;
    private handleCustomEvent;
    private handleStatusChange;
    private applySnapshot;
    private trimArray;
    private render;
    private updateContent;
    private updateSummary;
    private updateConnectionStatus;
    private getPanelCount;
    private getPanelOptions;
    private attachEventListeners;
    private renderReplPanel;
    private attachResizeListeners;
    private startResize;
    private handleResize;
    private attachExpandableRowListeners;
    private attachCopyListeners;
    private attachSortToggleListeners;
    private attachSQLSelectionListeners;
}
//# sourceMappingURL=debug-toolbar.d.ts.map