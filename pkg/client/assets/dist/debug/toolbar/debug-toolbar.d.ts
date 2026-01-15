export declare class DebugToolbar extends HTMLElement {
    private shadow;
    private stream;
    private snapshot;
    private expanded;
    private activePanel;
    private connectionStatus;
    private slowThresholdMs;
    static get observedAttributes(): string[];
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
    private get basePath();
    private get debugPath();
    private get panels();
    private get wsUrl();
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
    private attachEventListeners;
}
//# sourceMappingURL=debug-toolbar.d.ts.map