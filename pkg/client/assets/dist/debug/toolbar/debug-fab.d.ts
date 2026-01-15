import { DebugStream, type DebugStreamStatus } from '../debug-stream.js';
import { type DebugSnapshot } from './panel-renderers.js';
export declare class DebugFab extends HTMLElement {
    private shadow;
    private stream;
    private snapshot;
    private connectionStatus;
    private isHovered;
    private toolbarExpanded;
    static get observedAttributes(): string[];
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
    setToolbarExpanded(expanded: boolean): void;
    getSnapshot(): DebugSnapshot;
    getConnectionStatus(): DebugStreamStatus;
    getStream(): DebugStream | null;
    private get debugPath();
    private get panels();
    private loadState;
    private saveState;
    private initWebSocket;
    private fetchInitialSnapshot;
    private handleEvent;
    private handleCustomEvent;
    private handleStatusChange;
    private applySnapshot;
    private trimArray;
    private render;
    private updateCounters;
    private updateConnectionStatus;
    private attachEventListeners;
}
//# sourceMappingURL=debug-fab.d.ts.map